-- Forward-only step 4 of 8 in the Production schema upgrade.
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
-- Creates or replaces 7 views. All are defined over tables created in step 01.

create or replace view "public"."partner_onboarding_agreements_safe" as  SELECT id,
    workspace_id,
    agreement_type,
    status,
    is_required,
    partner_safe_detail,
    finalized_asset_id,
    effective_date,
    recorded_at,
    created_at,
    updated_at
   FROM partner_onboarding_agreements a;

create or replace view "public"."partner_onboarding_artifact_versions_safe" as  SELECT id,
    artifact_id,
    workspace_id,
    version_number,
    generator_version,
    rendered_content,
    generation_status,
    approval_status,
    partner_review_status,
    partner_visible_instructions,
    source_drift_invalidated_at,
    generated_at,
    superseded_at
   FROM partner_onboarding_artifact_versions
  WHERE (generation_status = 'succeeded'::text);

create or replace view "public"."partner_onboarding_assets_safe" as  SELECT id,
    workspace_id,
    category,
    original_filename,
    safe_filename,
    media_type,
    file_extension,
    byte_size,
    width_pixels,
    height_pixels,
    lifecycle_status,
    review_status,
    replaced_by_asset_id,
    uploaded_at,
    deleted_at,
    created_at,
    updated_at
   FROM partner_onboarding_assets a;

create or replace view "public"."partner_onboarding_change_requests_safe" as  SELECT id,
    workspace_id,
    section_id,
    status,
    partner_safe_instructions,
    requested_at,
    partner_response,
    responded_at,
    resolved_at,
    created_at,
    updated_at
   FROM partner_onboarding_change_requests cr;

create or replace view "public"."partner_onboarding_prefill_values_safe" as  SELECT id,
    batch_id,
    workspace_id,
    section_key,
    field_key,
    review_status,
    partner_review_status,
    partner_reviewed_at,
    partner_modified,
    applied_at,
    applied_section_revision,
    partner_reviewed_section_revision
   FROM partner_onboarding_prefill_values
  WHERE (review_status = 'applied'::text);

create or replace view "public"."partner_onboarding_tasks_safe" as  SELECT id,
    partner_slug,
    task_key,
    title,
    description,
    status,
    owner,
    required,
    completed_at,
    created_at,
    updated_at
   FROM partner_onboarding_tasks pot;

create or replace view "public"."partner_onboarding_workspace_safe" as  SELECT id,
    partner_slug,
    partner_record_id,
    status,
    schema_version,
    aggregate_version,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    commercial_gate_status,
    commercial_gate_changed_at,
    agreement_status,
    agreement_date,
    billing_contact_name,
    billing_contact_email,
    package_name,
    public_display_name,
    public_headline,
    public_subheadline,
    support_instructions,
    show_partner_logo,
    show_powered_by,
    profile_ready,
    billing_ready,
    access_controls_ready,
    landing_page_ready,
    admin_users_ready,
    launch_materials_ready,
    training_review_ready,
    internal_approved_at,
    submitted_at,
    submitted_schema_version,
    launched_at,
    paused_at,
    closed_at,
    last_meaningful_activity_at,
    created_at,
    updated_at,
    launch_readiness_state
   FROM partner_onboarding po;


-- View options. security_invoker makes each of these views run with the querying
-- role's own privileges and row level security rather than the view owner's, which is
-- the entire reason a partner-safe view is safe; security_barrier keeps a user-supplied
-- predicate from being pushed below the view's own filtering. A schema diff that only
-- compares view bodies does not see either setting, so they are set explicitly here.
alter view "public"."partner_onboarding_agreements_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_artifact_versions_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_assets_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_change_requests_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_prefill_values_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_tasks_safe" set (security_barrier=true, security_invoker=true);
alter view "public"."partner_onboarding_workspace_safe" set (security_barrier=true, security_invoker=true);
