-- Forward-only step 3 of 8 in the Production schema upgrade.
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
-- Adds constraints and indexes, then validates the constraints added NOT VALID.
--
-- Two CHECK constraints are dropped and re-added, both BROADENING the accepted
-- value set, so no existing row can be rejected:
--   rcap_intake_sessions_eligibility_signal_check  5 -> 9 accepted values
--   rcap_record_events_record_type_check           2 -> 5 accepted values
--
-- Deliberately absent: the narrowing of legalease_os_support_items_source_check and
-- legalease_os_support_items_type_check. supabase/phase-31-legalease-os-support-queue.sql
-- would restrict those to a single value each, but Production accepts two, and
-- src/lib/legalease/correspondence.ts writes source 'legalease_umbrella_site' and
-- type 'waitlist_request' today. Applying the narrowing would fail on existing rows
-- or break the umbrella-site contact and waitlist paths. Production's wider
-- definition is kept and the stale repository input is left for a separate fix.

alter table "public"."rcap_intake_sessions" drop constraint "rcap_intake_sessions_eligibility_signal_check";

alter table "public"."rcap_record_events" drop constraint "rcap_record_events_record_type_check";

CREATE UNIQUE INDEX consumer_briefcase_items_checkout_session_uk ON public.consumer_briefcase_items USING btree (checkout_session_id) WHERE (checkout_session_id IS NOT NULL);

CREATE UNIQUE INDEX consumer_briefcase_items_provider_event_uk ON public.consumer_briefcase_items USING btree (provider_event_id) WHERE (provider_event_id IS NOT NULL);

CREATE UNIQUE INDEX consumer_briefcase_items_user_source_session_uk ON public.consumer_briefcase_items USING btree (user_id, source_session_id) WHERE (source_session_id IS NOT NULL);

CREATE UNIQUE INDEX consumer_packet_payment_consumption_item_uk ON public.consumer_packet_payment_consumption USING btree (consumer_briefcase_item_id);

CREATE UNIQUE INDEX consumer_packet_payment_consumption_pkey ON public.consumer_packet_payment_consumption USING btree (id);

CREATE UNIQUE INDEX consumer_packet_payment_consumption_receipt_uk ON public.consumer_packet_payment_consumption USING btree (provider_event_id) WHERE (provider_event_id IS NOT NULL);

CREATE UNIQUE INDEX packet_credit_ledger_consumption_unit_idx ON public.packet_credit_ledger USING btree (consumption_unit_hash) WHERE (event_type = ANY (ARRAY['consumed'::text, 'overage_consumed'::text]));

CREATE INDEX packet_credit_ledger_entitlement_idx ON public.packet_credit_ledger USING btree (entitlement_id, event_type) WHERE (entitlement_id IS NOT NULL);

CREATE INDEX packet_credit_ledger_job_idx ON public.packet_credit_ledger USING btree (render_job_id);

CREATE UNIQUE INDEX packet_credit_ledger_pkey ON public.packet_credit_ledger USING btree (id);

CREATE INDEX packet_delivery_events_job_idx ON public.packet_delivery_events USING btree (render_job_id, created_at);

CREATE UNIQUE INDEX packet_delivery_events_pkey ON public.packet_delivery_events USING btree (id);

CREATE INDEX packet_render_jobs_claimable_idx ON public.packet_render_jobs USING btree (renderer_kind, created_at) WHERE (status = 'queued'::text);

CREATE INDEX packet_render_jobs_consumer_item_idx ON public.packet_render_jobs USING btree (consumer_briefcase_item_id) WHERE (consumer_briefcase_item_id IS NOT NULL);

CREATE UNIQUE INDEX packet_render_jobs_input_hash_live_unique ON public.packet_render_jobs USING btree (packet_id, input_hash) WHERE (status <> 'failed'::text);

CREATE INDEX packet_render_jobs_packet_idx ON public.packet_render_jobs USING btree (packet_id, created_at);

CREATE INDEX packet_render_jobs_partner_idx ON public.packet_render_jobs USING btree (partner_id, created_at DESC) WHERE (partner_id IS NOT NULL);

CREATE UNIQUE INDEX packet_render_jobs_pkey ON public.packet_render_jobs USING btree (id);

CREATE INDEX partner_access_codes_campaign_idx ON public.partner_access_codes USING btree (partner_slug, campaign_name);

CREATE INDEX partner_access_codes_code_hash_idx ON public.partner_access_codes USING btree (code_hash);

CREATE INDEX partner_access_codes_partner_active_idx ON public.partner_access_codes USING btree (partner_slug, is_active);

CREATE UNIQUE INDEX partner_access_codes_partner_code_unique ON public.partner_access_codes USING btree (partner_slug, code_hash);

CREATE INDEX partner_access_codes_partner_slug_idx ON public.partner_access_codes USING btree (partner_slug);

CREATE UNIQUE INDEX partner_access_codes_pkey ON public.partner_access_codes USING btree (id);

CREATE INDEX partner_email_deliveries_created_at_idx ON public.partner_email_deliveries USING btree (created_at);

CREATE INDEX partner_email_deliveries_email_type_idx ON public.partner_email_deliveries USING btree (email_type);

CREATE INDEX partner_email_deliveries_partner_slug_idx ON public.partner_email_deliveries USING btree (partner_slug);

CREATE UNIQUE INDEX partner_email_deliveries_pkey ON public.partner_email_deliveries USING btree (id);

CREATE INDEX partner_email_deliveries_status_idx ON public.partner_email_deliveries USING btree (status);

CREATE UNIQUE INDEX partner_onboarding_activity_artifact_event_unique ON public.partner_onboarding_activity USING btree (artifact_version_id, event_type) WHERE (artifact_version_id IS NOT NULL);

CREATE UNIQUE INDEX partner_onboarding_activity_dedupe_unique ON public.partner_onboarding_activity USING btree (workspace_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);

CREATE UNIQUE INDEX partner_onboarding_activity_pkey ON public.partner_onboarding_activity USING btree (id);

CREATE INDEX partner_onboarding_activity_workspace_time_idx ON public.partner_onboarding_activity USING btree (workspace_id, occurred_at DESC);

CREATE UNIQUE INDEX partner_onboarding_agreements_pkey ON public.partner_onboarding_agreements USING btree (id);

CREATE INDEX partner_onboarding_agreements_workspace_status_idx ON public.partner_onboarding_agreements USING btree (workspace_id, status);

CREATE UNIQUE INDEX partner_onboarding_agreements_workspace_type_unique ON public.partner_onboarding_agreements USING btree (workspace_id, agreement_type);

CREATE UNIQUE INDEX partner_onboarding_artifact_reviews_pkey ON public.partner_onboarding_artifact_reviews USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_artifact_reviews_request_unique ON public.partner_onboarding_artifact_reviews USING btree (artifact_version_id, request_id);

CREATE INDEX partner_onboarding_artifact_reviews_version_idx ON public.partner_onboarding_artifact_reviews USING btree (artifact_version_id, reviewed_at DESC);

CREATE INDEX partner_onboarding_artifact_reviews_workspace_idx ON public.partner_onboarding_artifact_reviews USING btree (workspace_id);

CREATE INDEX partner_onboarding_artifact_versions_artifact_idx ON public.partner_onboarding_artifact_versions USING btree (artifact_id, version_number DESC);

CREATE UNIQUE INDEX partner_onboarding_artifact_versions_number_unique ON public.partner_onboarding_artifact_versions USING btree (artifact_id, version_number);

CREATE UNIQUE INDEX partner_onboarding_artifact_versions_pkey ON public.partner_onboarding_artifact_versions USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_artifact_versions_request_unique ON public.partner_onboarding_artifact_versions USING btree (artifact_id, request_id);

CREATE INDEX partner_onboarding_artifact_versions_workspace_idx ON public.partner_onboarding_artifact_versions USING btree (workspace_id);

CREATE INDEX partner_onboarding_artifacts_partner_idx ON public.partner_onboarding_artifacts USING btree (partner_record_id);

CREATE UNIQUE INDEX partner_onboarding_artifacts_pkey ON public.partner_onboarding_artifacts USING btree (id);

CREATE INDEX partner_onboarding_artifacts_workspace_idx ON public.partner_onboarding_artifacts USING btree (workspace_id);

CREATE UNIQUE INDEX partner_onboarding_artifacts_workspace_type_unique ON public.partner_onboarding_artifacts USING btree (workspace_id, artifact_type);

CREATE UNIQUE INDEX partner_onboarding_assets_current_category_unique ON public.partner_onboarding_assets USING btree (workspace_id, category) WHERE ((lifecycle_status = ANY (ARRAY['pending_review'::text, 'active'::text])) AND (deleted_at IS NULL));

CREATE UNIQUE INDEX partner_onboarding_assets_object_path_unique ON public.partner_onboarding_assets USING btree (object_path);

CREATE UNIQUE INDEX partner_onboarding_assets_pkey ON public.partner_onboarding_assets USING btree (id);

CREATE INDEX partner_onboarding_assets_workspace_idx ON public.partner_onboarding_assets USING btree (workspace_id, uploaded_at DESC);

CREATE UNIQUE INDEX partner_onboarding_authorizations_pkey ON public.partner_onboarding_authorizations USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_authorizations_workspace_request_unique ON public.partner_onboarding_authorizations USING btree (workspace_id, request_id);

CREATE INDEX partner_onboarding_authorizations_workspace_time_idx ON public.partner_onboarding_authorizations USING btree (workspace_id, authorization_timestamp DESC);

CREATE UNIQUE INDEX partner_onboarding_change_request_internal_notes_pkey ON public.partner_onboarding_change_request_internal_notes USING btree (id);

CREATE INDEX partner_onboarding_change_request_internal_notes_request_idx ON public.partner_onboarding_change_request_internal_notes USING btree (change_request_id, created_at);

CREATE UNIQUE INDEX partner_onboarding_change_requests_one_open_per_section ON public.partner_onboarding_change_requests USING btree (section_id) WHERE (status = ANY (ARRAY['open'::text, 'partner_responded'::text]));

CREATE UNIQUE INDEX partner_onboarding_change_requests_pkey ON public.partner_onboarding_change_requests USING btree (id);

CREATE INDEX partner_onboarding_change_requests_workspace_status_idx ON public.partner_onboarding_change_requests USING btree (workspace_id, status, requested_at DESC);

CREATE UNIQUE INDEX partner_onboarding_contacts_active_role_unique ON public.partner_onboarding_contacts USING btree (workspace_id, role) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX partner_onboarding_contacts_pkey ON public.partner_onboarding_contacts USING btree (id);

CREATE INDEX partner_onboarding_contacts_workspace_idx ON public.partner_onboarding_contacts USING btree (workspace_id) WHERE (deleted_at IS NULL);

CREATE INDEX partner_onboarding_idempotency_expiry_idx ON public.partner_onboarding_idempotency USING btree (expires_at);

CREATE UNIQUE INDEX partner_onboarding_idempotency_pkey ON public.partner_onboarding_idempotency USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_idempotency_request_unique ON public.partner_onboarding_idempotency USING btree (request_id);

CREATE INDEX partner_onboarding_idempotency_workspace_created_idx ON public.partner_onboarding_idempotency USING btree (workspace_id, created_at DESC);

CREATE UNIQUE INDEX partner_onboarding_idempotency_workspace_operation_request_uniq ON public.partner_onboarding_idempotency USING btree (workspace_id, operation_key, request_id);

CREATE UNIQUE INDEX partner_onboarding_integration_events_idempotency_unique ON public.partner_onboarding_integration_events USING btree (idempotency_key);

CREATE UNIQUE INDEX partner_onboarding_integration_events_pkey ON public.partner_onboarding_integration_events USING btree (id);

CREATE INDEX partner_onboarding_integration_events_workspace_version_idx ON public.partner_onboarding_integration_events USING btree (workspace_id, workspace_aggregate_version, occurred_at);

CREATE UNIQUE INDEX partner_onboarding_launch_approvals_pkey ON public.partner_onboarding_launch_approvals USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_launch_approvals_request_unique ON public.partner_onboarding_launch_approvals USING btree (workspace_id, request_id);

CREATE INDEX partner_onboarding_launch_approvals_workspace_idx ON public.partner_onboarding_launch_approvals USING btree (workspace_id, recorded_at DESC);

CREATE INDEX partner_onboarding_launch_checks_partner_idx ON public.partner_onboarding_launch_checks USING btree (partner_record_id);

CREATE UNIQUE INDEX partner_onboarding_launch_checks_pkey ON public.partner_onboarding_launch_checks USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_launch_checks_request_unique ON public.partner_onboarding_launch_checks USING btree (workspace_id, request_id);

CREATE INDEX partner_onboarding_launch_checks_workspace_idx ON public.partner_onboarding_launch_checks USING btree (workspace_id);

CREATE UNIQUE INDEX partner_onboarding_launch_checks_workspace_key_unique ON public.partner_onboarding_launch_checks USING btree (workspace_id, check_key);

CREATE UNIQUE INDEX partner_onboarding_partner_record_id_unique ON public.partner_onboarding USING btree (partner_record_id) WHERE (partner_record_id IS NOT NULL);

CREATE UNIQUE INDEX partner_onboarding_partner_slug_key ON public.partner_onboarding USING btree (partner_slug);

CREATE UNIQUE INDEX partner_onboarding_pkey ON public.partner_onboarding USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_planned_users_active_email_unique ON public.partner_onboarding_planned_users USING btree (workspace_id, lower(work_email)) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX partner_onboarding_planned_users_pkey ON public.partner_onboarding_planned_users USING btree (id);

CREATE INDEX partner_onboarding_planned_users_workspace_idx ON public.partner_onboarding_planned_users USING btree (workspace_id) WHERE (deleted_at IS NULL);

CREATE INDEX partner_onboarding_prefill_batches_partner_status_idx ON public.partner_onboarding_prefill_batches USING btree (partner_record_id, status);

CREATE UNIQUE INDEX partner_onboarding_prefill_batches_pkey ON public.partner_onboarding_prefill_batches USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_prefill_batches_request_unique ON public.partner_onboarding_prefill_batches USING btree (request_id);

CREATE INDEX partner_onboarding_prefill_batches_workspace_time_idx ON public.partner_onboarding_prefill_batches USING btree (workspace_id, created_at DESC);

CREATE UNIQUE INDEX partner_onboarding_prefill_values_active_field_unique ON public.partner_onboarding_prefill_values USING btree (workspace_id, section_key, field_key) WHERE ((review_status = ANY (ARRAY['proposed'::text, 'approved'::text, 'applied'::text, 'conflict'::text])) AND (superseded_at IS NULL));

CREATE INDEX partner_onboarding_prefill_values_batch_status_idx ON public.partner_onboarding_prefill_values USING btree (batch_id, review_status);

CREATE UNIQUE INDEX partner_onboarding_prefill_values_pkey ON public.partner_onboarding_prefill_values USING btree (id);

CREATE INDEX partner_onboarding_prefill_values_section_pending_idx ON public.partner_onboarding_prefill_values USING btree (workspace_id, section_key, partner_review_status) WHERE (review_status = 'applied'::text);

CREATE INDEX partner_onboarding_prefill_values_workspace_status_idx ON public.partner_onboarding_prefill_values USING btree (workspace_id, review_status, partner_review_status);

CREATE UNIQUE INDEX partner_onboarding_report_recipients_active_email_unique ON public.partner_onboarding_report_recipients USING btree (workspace_id, lower(work_email)) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX partner_onboarding_report_recipients_pkey ON public.partner_onboarding_report_recipients USING btree (id);

CREATE INDEX partner_onboarding_report_recipients_workspace_idx ON public.partner_onboarding_report_recipients USING btree (workspace_id) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX partner_onboarding_sections_pkey ON public.partner_onboarding_sections USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_sections_workspace_key_unique ON public.partner_onboarding_sections USING btree (workspace_id, section_key);

CREATE INDEX partner_onboarding_sections_workspace_status_idx ON public.partner_onboarding_sections USING btree (workspace_id, status);

CREATE INDEX partner_onboarding_status_idx ON public.partner_onboarding USING btree (status);

CREATE UNIQUE INDEX partner_onboarding_submission_request_unique ON public.partner_onboarding USING btree (submission_request_id) WHERE (submission_request_id IS NOT NULL);

CREATE INDEX partner_onboarding_target_launch_date_idx ON public.partner_onboarding USING btree (target_launch_date) WHERE (status <> ALL (ARRAY['live'::text, 'closed'::text]));

CREATE INDEX partner_onboarding_tasks_partner_idx ON public.partner_onboarding_tasks USING btree (partner_slug);

CREATE UNIQUE INDEX partner_onboarding_tasks_pkey ON public.partner_onboarding_tasks USING btree (id);

CREATE UNIQUE INDEX partner_onboarding_tasks_unique ON public.partner_onboarding_tasks USING btree (partner_slug, task_key);

CREATE UNIQUE INDEX partner_packet_entitlement_active_unique ON public.partner_packet_entitlement USING btree (partner_id, entitlement_scope) WHERE (expires_at IS NULL);

CREATE UNIQUE INDEX partner_packet_entitlement_pkey ON public.partner_packet_entitlement USING btree (id);

CREATE INDEX partner_records_stripe_checkout_session_id_idx ON public.partner_records USING btree (stripe_checkout_session_id);

CREATE INDEX rcap_document_packets_dc_pathway_idx ON public.rcap_document_packets USING btree (state, pathway) WHERE (state = 'DC'::text);

CREATE INDEX rcap_document_packets_remedy_type_idx ON public.rcap_document_packets USING btree (remedy_type);

CREATE INDEX rcap_document_packets_state_pathway_idx ON public.rcap_document_packets USING btree (state, pathway);

CREATE INDEX rcap_screening_analytics_events_code_idx ON public.rcap_screening_analytics_events USING btree (partner_access_code_id);

CREATE INDEX rcap_screening_analytics_events_partner_idx ON public.rcap_screening_analytics_events USING btree (partner_slug, occurred_at);

CREATE UNIQUE INDEX rcap_screening_analytics_events_pkey ON public.rcap_screening_analytics_events USING btree (id);

CREATE INDEX rcap_screening_analytics_events_session_idx ON public.rcap_screening_analytics_events USING btree (session_id, event_type);

CREATE INDEX screening_sessions_nudge_due_idx ON public.screening_sessions USING btree (resume_sent_at, status) WHERE ((resume_sent_at IS NOT NULL) AND (resume_email_normalized IS NOT NULL) AND (resume_consent_at IS NOT NULL) AND (nudge_opted_out_at IS NULL));

CREATE INDEX screening_sessions_partner_access_code_idx ON public.screening_sessions USING btree (partner_access_code_id) WHERE (partner_access_code_id IS NOT NULL);

alter table "public"."consumer_packet_payment_consumption" add constraint "consumer_packet_payment_consumption_pkey" PRIMARY KEY using index "consumer_packet_payment_consumption_pkey";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_pkey" PRIMARY KEY using index "packet_credit_ledger_pkey";

alter table "public"."packet_delivery_events" add constraint "packet_delivery_events_pkey" PRIMARY KEY using index "packet_delivery_events_pkey";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_pkey" PRIMARY KEY using index "packet_render_jobs_pkey";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_pkey" PRIMARY KEY using index "partner_access_codes_pkey";

alter table "public"."partner_email_deliveries" add constraint "partner_email_deliveries_pkey" PRIMARY KEY using index "partner_email_deliveries_pkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_pkey" PRIMARY KEY using index "partner_onboarding_pkey";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_pkey" PRIMARY KEY using index "partner_onboarding_activity_pkey";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_pkey" PRIMARY KEY using index "partner_onboarding_agreements_pkey";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_pkey" PRIMARY KEY using index "partner_onboarding_artifact_reviews_pkey";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_pkey" PRIMARY KEY using index "partner_onboarding_artifact_versions_pkey";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_pkey" PRIMARY KEY using index "partner_onboarding_artifacts_pkey";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_pkey" PRIMARY KEY using index "partner_onboarding_assets_pkey";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_pkey" PRIMARY KEY using index "partner_onboarding_authorizations_pkey";

alter table "public"."partner_onboarding_change_request_internal_notes" add constraint "partner_onboarding_change_request_internal_notes_pkey" PRIMARY KEY using index "partner_onboarding_change_request_internal_notes_pkey";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_pkey" PRIMARY KEY using index "partner_onboarding_change_requests_pkey";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_pkey" PRIMARY KEY using index "partner_onboarding_contacts_pkey";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_pkey" PRIMARY KEY using index "partner_onboarding_idempotency_pkey";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_pkey" PRIMARY KEY using index "partner_onboarding_integration_events_pkey";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_pkey" PRIMARY KEY using index "partner_onboarding_launch_approvals_pkey";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_pkey" PRIMARY KEY using index "partner_onboarding_launch_checks_pkey";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_pkey" PRIMARY KEY using index "partner_onboarding_planned_users_pkey";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_pkey" PRIMARY KEY using index "partner_onboarding_prefill_batches_pkey";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_pkey" PRIMARY KEY using index "partner_onboarding_prefill_values_pkey";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_pkey" PRIMARY KEY using index "partner_onboarding_report_recipients_pkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_pkey" PRIMARY KEY using index "partner_onboarding_sections_pkey";

alter table "public"."partner_onboarding_tasks" add constraint "partner_onboarding_tasks_pkey" PRIMARY KEY using index "partner_onboarding_tasks_pkey";

alter table "public"."partner_packet_entitlement" add constraint "partner_packet_entitlement_pkey" PRIMARY KEY using index "partner_packet_entitlement_pkey";

alter table "public"."rcap_screening_analytics_events" add constraint "rcap_screening_analytics_events_pkey" PRIMARY KEY using index "rcap_screening_analytics_events_pkey";

alter table "public"."consumer_briefcase_items" add constraint "consumer_briefcase_items_currency_check" CHECK (((currency IS NULL) OR (currency = 'usd'::text))) not valid;

alter table "public"."consumer_briefcase_items" validate constraint "consumer_briefcase_items_currency_check";

alter table "public"."consumer_briefcase_items" add constraint "consumer_briefcase_items_paid_requires_server_evidence" CHECK (((payment_status <> 'paid'::text) OR ((payment_authority IS NOT NULL) AND (provider_event_id IS NOT NULL) AND (payment_recorded_at IS NOT NULL) AND (amount_cents = 5000) AND (currency = 'usd'::text) AND (NULLIF(TRIM(BOTH FROM COALESCE(checkout_session_id, ''::text)), ''::text) IS NOT NULL) AND (payment_product_id = 'expungement_packet'::text) AND (payment_person_id IS NOT NULL) AND (payment_matter_id = consumer_matter_id_for_briefcase_item(id))))) not valid;

alter table "public"."consumer_briefcase_items" validate constraint "consumer_briefcase_items_paid_requires_server_evidence";

alter table "public"."consumer_briefcase_items" add constraint "consumer_briefcase_items_payment_authority_check" CHECK (((payment_authority IS NULL) OR (payment_authority = ANY (ARRAY['server_webhook'::text, 'server_admin'::text])))) not valid;

alter table "public"."consumer_briefcase_items" validate constraint "consumer_briefcase_items_payment_authority_check";

alter table "public"."consumer_briefcase_items" add constraint "consumer_briefcase_items_payment_product_check" CHECK (((payment_product_id IS NULL) OR (payment_product_id = 'expungement_packet'::text))) not valid;

alter table "public"."consumer_briefcase_items" validate constraint "consumer_briefcase_items_payment_product_check";

alter table "public"."consumer_packet_payment_consumption" add constraint "consumer_payment_consumption_amount_check" CHECK ((amount_cents = 5000)) not valid;

alter table "public"."consumer_packet_payment_consumption" validate constraint "consumer_payment_consumption_amount_check";

alter table "public"."consumer_packet_payment_consumption" add constraint "consumer_payment_consumption_currency_check" CHECK ((currency = 'usd'::text)) not valid;

alter table "public"."consumer_packet_payment_consumption" validate constraint "consumer_payment_consumption_currency_check";

alter table "public"."consumer_packet_payment_consumption" add constraint "consumer_payment_consumption_product_check" CHECK ((product_id = 'expungement_packet'::text)) not valid;

alter table "public"."consumer_packet_payment_consumption" validate constraint "consumer_payment_consumption_product_check";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_consuming_identity_check" CHECK (((event_type = 'zero_charge'::text) OR ((entitlement_id IS NOT NULL) AND (partner_id IS NOT NULL) AND (person_id IS NOT NULL) AND (matter_id IS NOT NULL)))) not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_consuming_identity_check";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_entitlement_id_fkey" FOREIGN KEY (entitlement_id) REFERENCES partner_packet_entitlement(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_entitlement_id_fkey";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_event_type_check" CHECK ((event_type = ANY (ARRAY['consumed'::text, 'overage_consumed'::text, 'zero_charge'::text]))) not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_event_type_check";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_hash_shape_check" CHECK ((consumption_unit_hash ~ '^[0-9a-f]{64}$'::text)) not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_hash_shape_check";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partner_records(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_partner_id_fkey";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_person_id_fkey" FOREIGN KEY (person_id) REFERENCES rcap_persons(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_person_id_fkey";

alter table "public"."packet_credit_ledger" add constraint "packet_credit_ledger_render_job_id_fkey" FOREIGN KEY (render_job_id) REFERENCES packet_render_jobs(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_credit_ledger" validate constraint "packet_credit_ledger_render_job_id_fkey";

alter table "public"."packet_delivery_events" add constraint "packet_delivery_events_event_type_check" CHECK ((event_type = ANY (ARRAY['delivery_authorized'::text, 'transmission_started'::text, 'transmission_completed'::text, 'transmission_aborted'::text, 'transmission_failed'::text]))) not valid;

alter table "public"."packet_delivery_events" validate constraint "packet_delivery_events_event_type_check";

alter table "public"."packet_delivery_events" add constraint "packet_delivery_events_render_job_id_fkey" FOREIGN KEY (render_job_id) REFERENCES packet_render_jobs(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_delivery_events" validate constraint "packet_delivery_events_render_job_id_fkey";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_accounting_result_check" CHECK (((accounting_result IS NULL) OR (accounting_result = ANY (ARRAY['consumed'::text, 'already_consumed'::text, 'overage_consumed'::text, 'zero_charge'::text, 'cap_reached'::text, 'not_validated'::text, 'not_found'::text, 'unauthorized'::text, 'consumer_payment_required'::text, 'consumer_payment_matter_conflict'::text, 'consumer_payment_owner_mismatch'::text, 'consumer_payment_conflict'::text])))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_accounting_result_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_attempt_count_check" CHECK ((attempt_count >= 0)) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_attempt_count_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_delivery_eligibility_check" CHECK ((delivery_eligibility = ANY (ARRAY['not_evaluated'::text, 'eligible'::text, 'accounting_blocked'::text]))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_delivery_eligibility_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_eligible_requires_accounting_check" CHECK (((delivery_eligibility <> 'eligible'::text) OR ((status = ANY (ARRAY['artifact_validated'::text, 'delivered'::text])) AND (accounting_result = ANY (ARRAY['consumed'::text, 'already_consumed'::text, 'overage_consumed'::text, 'zero_charge'::text]))))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_eligible_requires_accounting_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_error_code_check" CHECK (((error_code IS NULL) OR (error_code = ANY (ARRAY['source_not_whitelisted'::text, 'profile_unknown'::text, 'render_failed'::text, 'invalid_pdf_output'::text, 'page_count_mismatch'::text, 'protected_field_populated'::text, 'storage_write_failed'::text, 'storage_readback_failed'::text, 'checksum_mismatch'::text, 'timeout'::text, 'worker_crashed'::text])))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_error_code_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_failed_requires_code" CHECK (((status <> 'failed'::text) OR (error_code IS NOT NULL))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_failed_requires_code";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_failure_disposition_check" CHECK (((failure_disposition IS NULL) OR (failure_disposition = ANY (ARRAY['retryable'::text, 'terminal'::text])))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_failure_disposition_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_input_hash_check" CHECK ((input_hash ~ '^[0-9a-f]{64}$'::text)) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_input_hash_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_max_attempts_check" CHECK (((max_attempts >= 1) AND (max_attempts <= 50))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_max_attempts_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_normalized_sha_check" CHECK (((normalized_output_sha256 IS NULL) OR (normalized_output_sha256 ~ '^[0-9a-f]{64}$'::text))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_normalized_sha_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_output_sha_check" CHECK (((output_sha256 IS NULL) OR (output_sha256 ~ '^[0-9a-f]{64}$'::text))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_output_sha_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_packet_id_fkey" FOREIGN KEY (packet_id) REFERENCES rcap_document_packets(id) ON DELETE CASCADE not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_packet_id_fkey";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_page_count_check" CHECK (((page_count IS NULL) OR (page_count > 0))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_page_count_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partner_records(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_partner_id_fkey";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_partner_identity_check" CHECK (((partner_id IS NULL) OR ((person_id IS NOT NULL) AND (matter_id IS NOT NULL)))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_partner_identity_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_person_id_fkey" FOREIGN KEY (person_id) REFERENCES rcap_persons(id) ON DELETE RESTRICT not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_person_id_fkey";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_source_presence_check" CHECK (((renderer_kind = 'packet_document_v1'::text) OR (source_sha256 IS NOT NULL))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_source_presence_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_source_sha_check" CHECK (((source_sha256 IS NULL) OR (source_sha256 ~ '^[0-9a-f]{64}$'::text))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_source_sha_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'claimed'::text, 'rendering'::text, 'validating'::text, 'artifact_validated'::text, 'delivered'::text, 'failed'::text]))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_status_check";

alter table "public"."packet_render_jobs" add constraint "packet_render_jobs_validated_requires_output" CHECK (((status <> ALL (ARRAY['artifact_validated'::text, 'delivered'::text])) OR ((output_storage_path IS NOT NULL) AND (output_storage_path <> ''::text) AND (output_sha256 IS NOT NULL) AND (normalized_output_sha256 IS NOT NULL) AND (container_digest IS NOT NULL)))) not valid;

alter table "public"."packet_render_jobs" validate constraint "packet_render_jobs_validated_requires_output";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_code_type_check" CHECK ((code_type = ANY (ARRAY['shared'::text, 'single_use'::text, 'limited_use'::text]))) not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_code_type_check";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_limited_use_requires_max_check" CHECK (((code_type <> 'limited_use'::text) OR (max_uses IS NOT NULL))) not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_limited_use_requires_max_check";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_max_uses_positive_check" CHECK (((max_uses IS NULL) OR (max_uses > 0))) not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_max_uses_positive_check";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_partner_code_unique" UNIQUE using index "partner_access_codes_partner_code_unique";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_partner_slug_fkey" FOREIGN KEY (partner_slug) REFERENCES partner_records(partner_slug) ON DELETE CASCADE not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_partner_slug_fkey";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_uses_count_nonnegative_check" CHECK ((uses_count >= 0)) not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_uses_count_nonnegative_check";

alter table "public"."partner_access_codes" add constraint "partner_access_codes_uses_within_max_check" CHECK (((max_uses IS NULL) OR (uses_count <= max_uses))) not valid;

alter table "public"."partner_access_codes" validate constraint "partner_access_codes_uses_within_max_check";

alter table "public"."partner_email_deliveries" add constraint "partner_email_deliveries_partner_slug_fkey" FOREIGN KEY (partner_slug) REFERENCES partner_records(partner_slug) ON DELETE CASCADE not valid;

alter table "public"."partner_email_deliveries" validate constraint "partner_email_deliveries_partner_slug_fkey";

alter table "public"."partner_entitlement" add constraint "partner_entitlement_overage_amount_nonnegative_check" CHECK ((overage_amount_cents >= 0)) not valid;

alter table "public"."partner_entitlement" validate constraint "partner_entitlement_overage_amount_nonnegative_check";

alter table "public"."partner_entitlement" add constraint "partner_entitlement_overage_packets_nonnegative_check" CHECK ((overage_packets >= 0)) not valid;

alter table "public"."partner_entitlement" validate constraint "partner_entitlement_overage_packets_nonnegative_check";

alter table "public"."partner_entitlement" add constraint "partner_entitlement_overage_price_nonnegative_check" CHECK ((overage_packet_price_cents >= 0)) not valid;

alter table "public"."partner_entitlement" validate constraint "partner_entitlement_overage_price_nonnegative_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_aggregate_version_check" CHECK ((aggregate_version > 0)) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_aggregate_version_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_agreement_status_check" CHECK ((agreement_status = ANY (ARRAY['not_sent'::text, 'sent'::text, 'signed'::text, 'waived_internal'::text]))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_agreement_status_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_closed_by_fkey" FOREIGN KEY (closed_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_closed_by_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_closed_consistency_check" CHECK ((((status <> 'closed'::text) AND (closed_at IS NULL) AND (closed_by IS NULL)) OR ((status = 'closed'::text) AND (closed_at IS NOT NULL) AND (closed_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_closed_consistency_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_commercial_gate_changed_by_fkey" FOREIGN KEY (commercial_gate_changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_commercial_gate_changed_by_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_commercial_gate_evidence_check" CHECK ((((commercial_gate_status <> ALL (ARRAY['cleared_by_paid_invoice'::text, 'cleared_by_approved_purchase_order'::text])) OR (NULLIF(btrim(commercial_gate_evidence_reference), ''::text) IS NOT NULL)) AND ((commercial_gate_status <> 'cleared_by_authorized_internal_override'::text) OR (NULLIF(btrim(commercial_gate_override_reason), ''::text) IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_commercial_gate_evidence_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_commercial_gate_status_check" CHECK ((commercial_gate_status = ANY (ARRAY['blocked'::text, 'cleared_by_paid_invoice'::text, 'cleared_by_approved_purchase_order'::text, 'cleared_by_authorized_internal_override'::text]))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_commercial_gate_status_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_completion_percentage_check" CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_completion_percentage_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_internal_approved_by_fkey" FOREIGN KEY (internal_approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_internal_approved_by_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_internal_reason_lengths_check" CHECK (((COALESCE(char_length(target_launch_date_reason), 0) <= 5000) AND (COALESCE(char_length(commercial_gate_evidence_reference), 0) <= 500) AND (COALESCE(char_length(commercial_gate_override_reason), 0) <= 5000) AND (COALESCE(char_length(internal_approval_reason), 0) <= 5000) AND (COALESCE(char_length(closed_reason), 0) <= 5000))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_internal_reason_lengths_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_launch_readiness_state_check" CHECK (((launch_readiness_state IS NULL) OR (launch_readiness_state = ANY (ARRAY['ready'::text, 'not_ready'::text])))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_launch_readiness_state_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_next_action_owner_check" CHECK ((next_action_owner = ANY (ARRAY['partner'::text, 'legalease'::text, 'none'::text]))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_next_action_owner_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_partner_record_id_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_partner_slug_fkey" FOREIGN KEY (partner_slug) REFERENCES partner_records(partner_slug) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_partner_slug_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_partner_slug_key" UNIQUE using index "partner_onboarding_partner_slug_key";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'commercially_blocked'::text, 'setup_in_progress'::text, 'waiting_on_partner'::text, 'ready_for_review'::text, 'ready_to_launch'::text, 'live'::text, 'paused'::text, 'closed'::text]))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_status_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_submission_consistency_check" CHECK ((((submitted_at IS NULL) AND (submitted_by IS NULL) AND (submission_request_id IS NULL)) OR ((submitted_at IS NOT NULL) AND (submitted_by IS NOT NULL) AND (submission_request_id IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_submission_consistency_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_submitted_by_fkey";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_target_launch_audit_check" CHECK ((((target_launch_date_reason IS NULL) AND (target_launch_date_changed_at IS NULL) AND (target_launch_date_changed_by IS NULL)) OR ((NULLIF(btrim(target_launch_date_reason), ''::text) IS NOT NULL) AND (target_launch_date_changed_at IS NOT NULL) AND (target_launch_date_changed_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_target_launch_audit_check";

alter table "public"."partner_onboarding" add constraint "partner_onboarding_target_launch_date_changed_by_fkey" FOREIGN KEY (target_launch_date_changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding" validate constraint "partner_onboarding_target_launch_date_changed_by_fkey";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_actor_user_id_fkey";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_artifact_version_id_fkey" FOREIGN KEY (artifact_version_id) REFERENCES partner_onboarding_artifact_versions(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_artifact_version_id_fkey";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_event_type_check" CHECK ((event_type = ANY (ARRAY['workspace_created'::text, 'commercial_gate_changed'::text, 'section_started'::text, 'section_completed'::text, 'section_change_requested'::text, 'section_resubmitted'::text, 'required_asset_uploaded'::text, 'required_asset_replaced'::text, 'required_asset_deleted'::text, 'onboarding_submitted'::text, 'section_approved'::text, 'section_waived'::text, 'ready_for_launch_decided'::text, 'prefill_batch_created'::text, 'prefill_known_data_imported'::text, 'prefill_suggestion_approved'::text, 'prefill_suggestion_rejected'::text, 'prefill_suggestion_superseded'::text, 'prefill_apply_conflict'::text, 'prefill_applied'::text, 'prefill_section_confirmed'::text, 'prefill_section_modified'::text, 'artifact_generated'::text, 'artifact_generation_failed'::text, 'artifact_changes_requested'::text, 'artifact_approved'::text, 'artifact_superseded'::text, 'artifact_partner_reviewed'::text, 'artifact_approval_invalidated'::text, 'launch_check_recorded'::text, 'launch_check_invalidated'::text, 'launch_approval_recorded'::text, 'launch_readiness_achieved'::text, 'launch_readiness_lost'::text]))) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_event_type_check";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_owner_check" CHECK ((owner_type = ANY (ARRAY['partner'::text, 'legalease'::text, 'system'::text]))) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_owner_check";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_section_key_check" CHECK (((section_key IS NULL) OR (section_key = ANY (ARRAY['organization_contacts'::text, 'program_goals'::text, 'geography_audience_language_accessibility'::text, 'access_sponsorship_capacity'::text, 'brand_public_page'::text, 'staff_dashboard_plan'::text, 'support_referrals_reporting'::text, 'review_authorization'::text])))) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_section_key_check";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_status_code_check" CHECK (((status_code IS NULL) OR ((char_length(status_code) between 1 and 120) AND (status_code ~ '^[a-z0-9_]+$'::text)))) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_status_code_check";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_summary_check" CHECK (((char_length(summary_code) between 1 and 120) AND (summary_code ~ '^[a-z0-9_]+$'::text))) not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_summary_check";

alter table "public"."partner_onboarding_activity" add constraint "partner_onboarding_activity_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_activity" validate constraint "partner_onboarding_activity_workspace_id_fkey";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_detail_check" CHECK (((partner_safe_detail IS NULL) OR (char_length(partner_safe_detail) <= 5000))) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_detail_check";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_finalized_asset_id_fkey" FOREIGN KEY (finalized_asset_id) REFERENCES partner_onboarding_assets(id) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_finalized_asset_id_fkey";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_recorded_by_fkey";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_recorded_consistency" CHECK ((((recorded_at IS NULL) AND (recorded_by IS NULL)) OR ((recorded_at IS NOT NULL) AND (recorded_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_recorded_consistency";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_status_check" CHECK ((status = ANY (ARRAY['not_required'::text, 'not_started'::text, 'requested'::text, 'under_review'::text, 'finalized'::text, 'executed'::text, 'approved'::text, 'waived'::text]))) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_status_check";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_type_check" CHECK ((agreement_type = ANY (ARRAY['order_form'::text, 'master_services_agreement'::text, 'data_privacy_security_addendum'::text, 'procurement_requirements'::text]))) not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_type_check";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_agreements" validate constraint "partner_onboarding_agreements_workspace_id_fkey";

alter table "public"."partner_onboarding_agreements" add constraint "partner_onboarding_agreements_workspace_type_unique" UNIQUE using index "partner_onboarding_agreements_workspace_type_unique";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_artifact_version_id_fkey" FOREIGN KEY (artifact_version_id) REFERENCES partner_onboarding_artifact_versions(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_artifact_version_id_fkey";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_comments_check" CHECK (((comments IS NULL) OR ((char_length(comments) >= 1) AND (char_length(comments) <= 5000)))) not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_comments_check";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_decision_check" CHECK ((decision = ANY (ARRAY['approve'::text, 'request_changes'::text, 'reject'::text]))) not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_decision_check";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_reason_required_check" CHECK (((decision = 'approve'::text) OR ((comments IS NOT NULL) AND (char_length(btrim(comments)) > 0)))) not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_reason_required_check";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_request_unique" UNIQUE using index "partner_onboarding_artifact_reviews_request_unique";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_reviewer_type_check" CHECK ((reviewer_type = ANY (ARRAY['legalease'::text, 'partner'::text]))) not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_reviewer_type_check";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_reviewer_user_id_fkey" FOREIGN KEY (reviewer_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_reviewer_user_id_fkey";

alter table "public"."partner_onboarding_artifact_reviews" add constraint "partner_onboarding_artifact_reviews_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifact_reviews" validate constraint "partner_onboarding_artifact_reviews_workspace_id_fkey";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_approval_check" CHECK ((approval_status = ANY (ARRAY['draft'::text, 'ready_for_review'::text, 'changes_requested'::text, 'approved'::text, 'superseded'::text, 'generation_failed'::text]))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_approval_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_artifact_id_fkey" FOREIGN KEY (artifact_id) REFERENCES partner_onboarding_artifacts(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_artifact_id_fkey";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_drift_pair_check" CHECK ((((source_drift_invalidated_at IS NULL) AND (invalidated_against_snapshot_hash IS NULL)) OR ((source_drift_invalidated_at IS NOT NULL) AND (invalidated_against_snapshot_hash IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_drift_pair_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_failed_consistency_check" CHECK (((generation_status = 'failed'::text) = (approval_status = 'generation_failed'::text))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_failed_consistency_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_failure_reason_check" CHECK (((generation_status = 'failed'::text) = (generation_error_code IS NOT NULL))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_failure_reason_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_generated_by_fkey";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_generation_check" CHECK ((generation_status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text]))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_generation_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_generator_version_check" CHECK (((char_length(generator_version) between 1 and 120) AND (generator_version ~ '^[a-z0-9_]+$'::text))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_generator_version_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_instructions_check" CHECK (((partner_visible_instructions IS NULL) OR ((char_length(partner_visible_instructions) >= 1) AND (char_length(partner_visible_instructions) <= 5000)))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_instructions_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_number_check" CHECK ((version_number > 0)) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_number_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_number_unique" UNIQUE using index "partner_onboarding_artifact_versions_number_unique";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_partner_review_check" CHECK ((partner_review_status = ANY (ARRAY['not_requested'::text, 'awaiting_partner'::text, 'changes_requested'::text, 'approved'::text]))) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_partner_review_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_request_unique" UNIQUE using index "partner_onboarding_artifact_versions_request_unique";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_snapshot_hash_check" CHECK ((snapshot_hash ~ '^[a-f0-9]{64}$'::text)) not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_snapshot_hash_check";

alter table "public"."partner_onboarding_artifact_versions" add constraint "partner_onboarding_artifact_versions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifact_versions" validate constraint "partner_onboarding_artifact_versions_workspace_id_fkey";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_current_version_fk" FOREIGN KEY (current_version_id) REFERENCES partner_onboarding_artifact_versions(id) ON DELETE SET NULL not valid;

alter table "public"."partner_onboarding_artifacts" validate constraint "partner_onboarding_artifacts_current_version_fk";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_lifecycle_check" CHECK ((lifecycle_status = ANY (ARRAY['not_generated'::text, 'unavailable_in_release'::text, 'draft'::text, 'in_review'::text, 'approved'::text, 'superseded'::text, 'generation_failed'::text]))) not valid;

alter table "public"."partner_onboarding_artifacts" validate constraint "partner_onboarding_artifacts_lifecycle_check";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifacts" validate constraint "partner_onboarding_artifacts_partner_record_id_fkey";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_type_check" CHECK ((artifact_type = ANY (ARRAY['implementation_brief'::text, 'operations_escalation_plan'::text, 'dashboard_user_reporting_matrix'::text, 'staff_quick_start_guide'::text, 'partner_launch_kit'::text, 'co_branded_page_configuration'::text]))) not valid;

alter table "public"."partner_onboarding_artifacts" validate constraint "partner_onboarding_artifacts_type_check";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_artifacts" validate constraint "partner_onboarding_artifacts_workspace_id_fkey";

alter table "public"."partner_onboarding_artifacts" add constraint "partner_onboarding_artifacts_workspace_type_unique" UNIQUE using index "partner_onboarding_artifacts_workspace_type_unique";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_bucket_check" CHECK ((bucket_id = 'rcap-partner-onboarding-private'::text)) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_bucket_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_byte_size_check" CHECK (((byte_size > 0) AND (byte_size <= 20971520))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_byte_size_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_category_check" CHECK ((category = ANY (ARRAY['transparent_logo'::text, 'brand_guide'::text, 'hero_or_community_image'::text, 'organizer_or_program_lead_image'::text, 'approved_partner_description_attachment'::text, 'procurement_document'::text, 'other_approved_organizational_asset'::text]))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_category_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_deleted_by_fkey";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_deleted_consistency" CHECK ((((deleted_at IS NULL) AND (deleted_by IS NULL)) OR ((deleted_at IS NOT NULL) AND (deleted_by IS NOT NULL) AND (lifecycle_status = 'deleted'::text)))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_deleted_consistency";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_dimensions_check" CHECK ((((width_pixels IS NULL) AND (height_pixels IS NULL)) OR ((width_pixels between 1 and 20000) AND (height_pixels between 1 and 20000)))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_dimensions_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_extension_check" CHECK ((file_extension = ANY (ARRAY['png'::text, 'jpg'::text, 'jpeg'::text, 'webp'::text, 'pdf'::text, 'docx'::text]))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_extension_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_lifecycle_check" CHECK ((lifecycle_status = ANY (ARRAY['pending_review'::text, 'active'::text, 'superseded'::text, 'deleted'::text]))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_lifecycle_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_media_type_check" CHECK ((media_type = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text, 'application/pdf'::text, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text]))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_media_type_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_partner_record_id_fkey";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_replaced_by_asset_id_fkey" FOREIGN KEY (replaced_by_asset_id) REFERENCES partner_onboarding_assets(id) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_replaced_by_asset_id_fkey";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_review_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_review_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_sha256_check" CHECK (((sha256_hex IS NULL) OR (sha256_hex ~ '^[0-9a-f]{64}$'::text))) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_sha256_check";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_uploaded_by_fkey";

alter table "public"."partner_onboarding_assets" add constraint "partner_onboarding_assets_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_assets" validate constraint "partner_onboarding_assets_workspace_id_fkey";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_all_acknowledged_check" CHECK ((organization_information_accurate AND program_scope_approved_for_configuration AND brand_assets_authorized_for_use AND no_eligibility_or_outcome_guarantee_understood AND contested_and_representation_matters_follow_escalation_plan AND dashboard_users_authorized AND legalease_may_prepare_draft_implementation_materials)) not valid;

alter table "public"."partner_onboarding_authorizations" validate constraint "partner_onboarding_authorizations_all_acknowledged_check";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_approver_user_id_fkey" FOREIGN KEY (approver_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_authorizations" validate constraint "partner_onboarding_authorizations_approver_user_id_fkey";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_name_check" CHECK (((char_length(approver_name) >= 1) AND (char_length(approver_name) <= 120))) not valid;

alter table "public"."partner_onboarding_authorizations" validate constraint "partner_onboarding_authorizations_name_check";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_title_check" CHECK (((char_length(approver_title) >= 1) AND (char_length(approver_title) <= 120))) not valid;

alter table "public"."partner_onboarding_authorizations" validate constraint "partner_onboarding_authorizations_title_check";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_authorizations" validate constraint "partner_onboarding_authorizations_workspace_id_fkey";

alter table "public"."partner_onboarding_authorizations" add constraint "partner_onboarding_authorizations_workspace_request_unique" UNIQUE using index "partner_onboarding_authorizations_workspace_request_unique";

alter table "public"."partner_onboarding_change_request_internal_notes" add constraint "partner_onboarding_change_request_intern_change_request_id_fkey" FOREIGN KEY (change_request_id) REFERENCES partner_onboarding_change_requests(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_change_request_internal_notes" validate constraint "partner_onboarding_change_request_intern_change_request_id_fkey";

alter table "public"."partner_onboarding_change_request_internal_notes" add constraint "partner_onboarding_change_request_internal_note_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_change_request_internal_notes" validate constraint "partner_onboarding_change_request_internal_note_created_by_fkey";

alter table "public"."partner_onboarding_change_request_internal_notes" add constraint "partner_onboarding_change_request_internal_notes_note_check" CHECK (((char_length(note) >= 1) AND (char_length(note) <= 5000))) not valid;

alter table "public"."partner_onboarding_change_request_internal_notes" validate constraint "partner_onboarding_change_request_internal_notes_note_check";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_instructions_check" CHECK (((char_length(partner_safe_instructions) >= 1) AND (char_length(partner_safe_instructions) <= 5000))) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_instructions_check";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_requested_by_fkey";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_resolution_consistency" CHECK ((((resolved_at IS NULL) AND (resolved_by IS NULL)) OR ((resolved_at IS NOT NULL) AND (resolved_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_resolution_consistency";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_resolved_by_fkey";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_responded_by_fkey" FOREIGN KEY (responded_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_responded_by_fkey";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_response_check" CHECK (((partner_response IS NULL) OR (char_length(partner_response) <= 5000))) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_response_check";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_response_consistency" CHECK ((((responded_at IS NULL) AND (responded_by IS NULL)) OR ((responded_at IS NOT NULL) AND (responded_by IS NOT NULL) AND (partner_response IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_response_consistency";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_section_id_fkey" FOREIGN KEY (section_id) REFERENCES partner_onboarding_sections(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_section_id_fkey";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'partner_responded'::text, 'resolved'::text, 'cancelled'::text]))) not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_status_check";

alter table "public"."partner_onboarding_change_requests" add constraint "partner_onboarding_change_requests_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_change_requests" validate constraint "partner_onboarding_change_requests_workspace_id_fkey";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_email_check" CHECK (((char_length(work_email) between 3 and 254) AND (work_email = lower(work_email)) AND (work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'::text))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_email_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_name_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_organization_check" CHECK (((organization IS NULL) OR (char_length(organization) <= 200))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_organization_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_phone_check" CHECK (((phone IS NULL) OR (char_length(phone) <= 32))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_phone_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_revision_check" CHECK ((revision > 0)) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_revision_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_role_check" CHECK ((role = ANY (ARRAY['executive_sponsor'::text, 'program_operator'::text, 'communications_lead'::text, 'reporting_evaluation_lead'::text, 'legal_services_referral_contact'::text, 'finance_procurement_contact'::text, 'technical_security_contact'::text, 'media_contact'::text]))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_role_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 120))) not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_title_check";

alter table "public"."partner_onboarding_contacts" add constraint "partner_onboarding_contacts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_contacts" validate constraint "partner_onboarding_contacts_workspace_id_fkey";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_actor_user_id_fkey";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_expiry_check" CHECK ((expires_at > created_at)) not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_expiry_check";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_operation_key_check" CHECK (((char_length(operation_key) between 1 and 120) AND (operation_key ~ '^[a-z0-9:_-]+$'::text))) not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_operation_key_check";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_payload_hash_check" CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text)) not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_payload_hash_check";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_request_unique" UNIQUE using index "partner_onboarding_idempotency_request_unique";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_result_status_check" CHECK ((result_status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text]))) not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_result_status_check";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_idempotency" validate constraint "partner_onboarding_idempotency_workspace_id_fkey";

alter table "public"."partner_onboarding_idempotency" add constraint "partner_onboarding_idempotency_workspace_operation_request_uniq" UNIQUE using index "partner_onboarding_idempotency_workspace_operation_request_uniq";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_code_check" CHECK ((((blocker_code IS NULL) OR ((char_length(blocker_code) between 1 and 120) AND (blocker_code ~ '^[a-z0-9_]+$'::text))) AND ((next_action_code IS NULL) OR ((char_length(next_action_code) between 1 and 120) AND (next_action_code ~ '^[a-z0-9_]+$'::text))))) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_code_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_completion_check" CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_completion_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_idempotency_check" CHECK (((char_length(idempotency_key) between 1 and 200) AND (idempotency_key ~ '^[A-Za-z0-9:_-]+$'::text))) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_idempotency_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_owner_check" CHECK ((next_action_owner = ANY (ARRAY['partner'::text, 'legalease'::text, 'none'::text]))) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_owner_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_partner_record_id_fkey";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_type_check" CHECK ((event_type = ANY (ARRAY['rcap_partner_workspace_created'::text, 'rcap_commercial_gate_changed'::text, 'rcap_onboarding_progressed'::text, 'rcap_onboarding_blocked'::text, 'rcap_onboarding_submitted'::text, 'rcap_team_configuration_changed'::text, 'rcap_brand_configuration_changed'::text, 'rcap_section_review_changed'::text, 'rcap_onboarding_prefill_prepared'::text, 'rcap_onboarding_prefill_applied'::text, 'rcap_onboarding_prefill_reviewed'::text, 'rcap_onboarding_artifact_generated'::text, 'rcap_onboarding_artifact_reviewed'::text, 'rcap_onboarding_artifact_invalidated'::text]))) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_type_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_version_check" CHECK ((workspace_aggregate_version > 0)) not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_version_check";

alter table "public"."partner_onboarding_integration_events" add constraint "partner_onboarding_integration_events_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_integration_events" validate constraint "partner_onboarding_integration_events_workspace_id_fkey";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_comments_check" CHECK (((comments IS NULL) OR ((char_length(comments) >= 1) AND (char_length(comments) <= 5000)))) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_comments_check";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_decision_check" CHECK ((decision = ANY (ARRAY['approve'::text, 'withdraw'::text]))) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_decision_check";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_owner_match_check" CHECK ((((approval_type = 'partner_launch_approval'::text) AND (reviewer_type = 'partner'::text)) OR ((approval_type = 'legalease_final_review'::text) AND (reviewer_type = 'legalease'::text)))) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_owner_match_check";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_request_unique" UNIQUE using index "partner_onboarding_launch_approvals_request_unique";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_reviewer_type_check" CHECK ((reviewer_type = ANY (ARRAY['legalease'::text, 'partner'::text]))) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_reviewer_type_check";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_reviewer_user_id_fkey" FOREIGN KEY (reviewer_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_reviewer_user_id_fkey";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_type_check" CHECK ((approval_type = ANY (ARRAY['partner_launch_approval'::text, 'legalease_final_review'::text]))) not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_type_check";

alter table "public"."partner_onboarding_launch_approvals" add constraint "partner_onboarding_launch_approvals_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_launch_approvals" validate constraint "partner_onboarding_launch_approvals_workspace_id_fkey";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_category_check" CHECK ((category = ANY (ARRAY['commercial_and_procurement'::text, 'configuration'::text, 'page_and_brand'::text, 'partner_team_and_reporting'::text, 'participant_journey'::text, 'training_and_resources'::text, 'approvals'::text]))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_category_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_checked_by_fkey" FOREIGN KEY (checked_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_checked_by_fkey";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_determination_check" CHECK ((determination = ANY (ARRAY['automated'::text, 'manual'::text]))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_determination_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_evidence_length_check" CHECK ((((evidence_summary IS NULL) OR ((char_length(evidence_summary) >= 1) AND (char_length(evidence_summary) <= 2000))) AND ((evidence_reference IS NULL) OR ((char_length(evidence_reference) >= 1) AND (char_length(evidence_reference) <= 500))))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_evidence_length_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_invalidation_pair_check" CHECK ((((invalidated_at IS NULL) AND (invalidated_reason IS NULL)) OR ((invalidated_at IS NOT NULL) AND (invalidated_reason IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_invalidation_pair_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_key_check" CHECK ((check_key ~ '^[a-z0-9_]{3,80}$'::text)) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_key_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_owner_check" CHECK ((owner_type = ANY (ARRAY['legalease'::text, 'partner'::text]))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_owner_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_partner_record_id_fkey";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_request_unique" UNIQUE using index "partner_onboarding_launch_checks_request_unique";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_reviewer_required_check" CHECK (((status <> ALL (ARRAY['passing'::text, 'waived'::text, 'not_applicable'::text])) OR ((checked_by IS NOT NULL) AND (checked_at IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_reviewer_required_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'passing'::text, 'failing'::text, 'needs_review'::text, 'waived'::text, 'not_applicable'::text]))) not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_status_check";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_launch_checks" validate constraint "partner_onboarding_launch_checks_workspace_id_fkey";

alter table "public"."partner_onboarding_launch_checks" add constraint "partner_onboarding_launch_checks_workspace_key_unique" UNIQUE using index "partner_onboarding_launch_checks_workspace_key_unique";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_email_check" CHECK (((char_length(work_email) between 3 and 254) AND (work_email = lower(work_email)) AND (work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'::text))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_email_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_invitation_status_check" CHECK ((invitation_status = ANY (ARRAY['not_invited'::text, 'planned'::text, 'released'::text]))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_invitation_status_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_membership_status_check" CHECK ((membership_status = ANY (ARRAY['planned'::text, 'active'::text, 'disabled'::text]))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_membership_status_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_name_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_permissions_check" CHECK ((special_permissions <@ ARRAY['manage_codes'::text, 'view_reports'::text, 'export_reports'::text, 'manage_users'::text])) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_permissions_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_revision_check" CHECK ((revision > 0)) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_revision_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_role_check" CHECK ((requested_role = ANY (ARRAY['partner_administrator'::text, 'program_staff'::text, 'reporting_viewer'::text]))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_role_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_training_status_check" CHECK ((training_status = ANY (ARRAY['not_started'::text, 'scheduled'::text, 'in_progress'::text, 'complete'::text]))) not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_training_status_check";

alter table "public"."partner_onboarding_planned_users" add constraint "partner_onboarding_planned_users_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_planned_users" validate constraint "partner_onboarding_planned_users_workspace_id_fkey";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_approval_check" CHECK ((((approved_at IS NULL) AND (approved_by IS NULL)) OR ((approved_at IS NOT NULL) AND (approved_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_approval_check";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_approved_by_fkey";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_created_by_fkey";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_partner_record_id_fkey" FOREIGN KEY (partner_record_id) REFERENCES partner_records(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_partner_record_id_fkey";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_request_unique" UNIQUE using index "partner_onboarding_prefill_batches_request_unique";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_source_summary_check" CHECK (((char_length(source_summary) between 1 and 500) AND (source_summary !~ '[[:cntrl:]]'::text))) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_source_summary_check";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'ready_for_review'::text, 'approved'::text, 'partially_applied'::text, 'applied'::text, 'rejected'::text, 'superseded'::text]))) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_status_check";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_version_check" CHECK ((aggregate_version > 0)) not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_version_check";

alter table "public"."partner_onboarding_prefill_batches" add constraint "partner_onboarding_prefill_batches_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_prefill_batches" validate constraint "partner_onboarding_prefill_batches_workspace_id_fkey";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_apply_check" CHECK ((((review_status <> 'applied'::text) AND (applied_at IS NULL) AND (applied_value_hash IS NULL) AND (applied_section_revision IS NULL) AND (applied_workspace_version IS NULL) AND (partner_review_status = 'not_applied'::text) AND (partner_reviewed_at IS NULL)) OR ((review_status = 'applied'::text) AND (applied_at IS NOT NULL) AND (applied_value_hash IS NOT NULL) AND (applied_section_revision IS NOT NULL) AND (applied_workspace_version IS NOT NULL) AND (partner_review_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'modified'::text, 'rejected'::text]))))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_apply_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES partner_onboarding_prefill_batches(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_batch_id_fkey";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_confidence_check" CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_confidence_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_created_by_fkey";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_field_key_check" CHECK (((char_length(field_key) between 1 and 120) AND (field_key ~ '^[a-z0-9_]+$'::text))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_field_key_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_hash_check" CHECK (((base_value_hash ~ '^[0-9a-f]{64}$'::text) AND (proposed_value_hash ~ '^[0-9a-f]{64}$'::text) AND ((applied_value_hash IS NULL) OR (applied_value_hash ~ '^[0-9a-f]{64}$'::text)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_hash_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_partner_review_check" CHECK ((((partner_review_status = ANY (ARRAY['not_applied'::text, 'pending'::text])) AND (partner_reviewed_at IS NULL) AND (partner_reviewed_section_revision IS NULL)) OR ((partner_review_status = ANY (ARRAY['confirmed'::text, 'modified'::text, 'rejected'::text])) AND (partner_reviewed_at IS NOT NULL) AND (partner_reviewed_section_revision IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_partner_review_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_partner_review_status_check" CHECK ((partner_review_status = ANY (ARRAY['not_applied'::text, 'pending'::text, 'confirmed'::text, 'modified'::text, 'rejected'::text]))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_partner_review_status_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_review_actor_check" CHECK ((((reviewed_at IS NULL) AND (reviewed_by IS NULL)) OR ((reviewed_at IS NOT NULL) AND (reviewed_by IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_review_actor_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_review_status_check" CHECK ((review_status = ANY (ARRAY['proposed'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'conflict'::text, 'superseded'::text]))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_review_status_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_reviewed_by_fkey";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_revision_check" CHECK (((base_section_revision >= 0) AND ((applied_section_revision IS NULL) OR (applied_section_revision > 0)) AND ((applied_workspace_version IS NULL) OR (applied_workspace_version > 0)) AND ((partner_reviewed_section_revision IS NULL) OR (partner_reviewed_section_revision > 0)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_revision_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_section_check" CHECK ((section_key = ANY (ARRAY['organization_contacts'::text, 'program_goals'::text, 'geography_audience_language_accessibility'::text, 'access_sponsorship_capacity'::text, 'brand_public_page'::text, 'staff_dashboard_plan'::text, 'support_referrals_reporting'::text, 'review_authorization'::text]))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_section_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_size_check" CHECK ((octet_length((proposed_value)::text) <= 65536)) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_size_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_source_label_check" CHECK (((char_length(source_label) between 1 and 200) AND (source_label !~ '[[:cntrl:]]'::text))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_source_label_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_source_reference_check" CHECK (((source_reference_id IS NULL) OR ((char_length(source_reference_id) between 1 and 200) AND (source_reference_id !~ '[[:cntrl:]]'::text)))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_source_reference_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_source_type_check" CHECK ((source_type = ANY (ARRAY['partner_record'::text, 'contact_record'::text, 'order_form'::text, 'agreement'::text, 'proposal'::text, 'meeting'::text, 'email'::text, 'kickoff'::text, 'manual'::text, 'other'::text]))) not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_source_type_check";

alter table "public"."partner_onboarding_prefill_values" add constraint "partner_onboarding_prefill_values_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_prefill_values" validate constraint "partner_onboarding_prefill_values_workspace_id_fkey";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES partner_onboarding_contacts(id) not valid;

alter table "public"."partner_onboarding_report_recipients" validate constraint "partner_onboarding_report_recipients_contact_id_fkey";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_email_check" CHECK (((char_length(work_email) between 3 and 254) AND (work_email = lower(work_email)) AND (work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'::text))) not valid;

alter table "public"."partner_onboarding_report_recipients" validate constraint "partner_onboarding_report_recipients_email_check";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_name_check" CHECK (((name IS NULL) OR (char_length(name) <= 120))) not valid;

alter table "public"."partner_onboarding_report_recipients" validate constraint "partner_onboarding_report_recipients_name_check";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_revision_check" CHECK ((revision > 0)) not valid;

alter table "public"."partner_onboarding_report_recipients" validate constraint "partner_onboarding_report_recipients_revision_check";

alter table "public"."partner_onboarding_report_recipients" add constraint "partner_onboarding_report_recipients_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_report_recipients" validate constraint "partner_onboarding_report_recipients_workspace_id_fkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_approved_by_fkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_completion_check" CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_completion_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_key_check" CHECK ((section_key = ANY (ARRAY['organization_contacts'::text, 'program_goals'::text, 'geography_audience_language_accessibility'::text, 'access_sponsorship_capacity'::text, 'brand_public_page'::text, 'staff_dashboard_plan'::text, 'support_referrals_reporting'::text, 'review_authorization'::text]))) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_key_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_response_size_check" CHECK ((octet_length((response_data)::text) <= 65536)) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_response_size_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_review_reason_check" CHECK (((review_reason IS NULL) OR ((char_length(review_reason) >= 1) AND (char_length(review_reason) <= 5000)))) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_review_reason_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_reviewed_by_fkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_revision_check" CHECK ((revision > 0)) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_revision_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'submitted'::text, 'needs_changes'::text, 'approved'::text, 'waived'::text, 'not_applicable'::text]))) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_status_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_waived_by_fkey" FOREIGN KEY (waived_by) REFERENCES auth.users(id) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_waived_by_fkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_waiver_check" CHECK (((status <> 'waived'::text) OR ((waived_at IS NOT NULL) AND (waived_by IS NOT NULL) AND (NULLIF(btrim(waiver_reason), ''::text) IS NOT NULL)))) not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_waiver_check";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES partner_onboarding(id) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_sections" validate constraint "partner_onboarding_sections_workspace_id_fkey";

alter table "public"."partner_onboarding_sections" add constraint "partner_onboarding_sections_workspace_key_unique" UNIQUE using index "partner_onboarding_sections_workspace_key_unique";

alter table "public"."partner_onboarding_tasks" add constraint "partner_onboarding_tasks_owner_check" CHECK ((owner = ANY (ARRAY['legalease'::text, 'partner'::text]))) not valid;

alter table "public"."partner_onboarding_tasks" validate constraint "partner_onboarding_tasks_owner_check";

alter table "public"."partner_onboarding_tasks" add constraint "partner_onboarding_tasks_partner_slug_fkey" FOREIGN KEY (partner_slug) REFERENCES partner_records(partner_slug) ON DELETE CASCADE not valid;

alter table "public"."partner_onboarding_tasks" validate constraint "partner_onboarding_tasks_partner_slug_fkey";

alter table "public"."partner_onboarding_tasks" add constraint "partner_onboarding_tasks_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'complete'::text, 'blocked'::text, 'skipped'::text]))) not valid;

alter table "public"."partner_onboarding_tasks" validate constraint "partner_onboarding_tasks_status_check";

alter table "public"."partner_onboarding_tasks" add constraint "partner_onboarding_tasks_unique" UNIQUE using index "partner_onboarding_tasks_unique";

alter table "public"."partner_packet_entitlement" add constraint "partner_packet_entitlement_cap_check" CHECK ((packet_cap >= 0)) not valid;

alter table "public"."partner_packet_entitlement" validate constraint "partner_packet_entitlement_cap_check";

alter table "public"."partner_packet_entitlement" add constraint "partner_packet_entitlement_overage_cap_check" CHECK ((overage_cap >= 0)) not valid;

alter table "public"."partner_packet_entitlement" validate constraint "partner_packet_entitlement_overage_cap_check";

alter table "public"."partner_packet_entitlement" add constraint "partner_packet_entitlement_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partner_records(id) ON DELETE RESTRICT not valid;

alter table "public"."partner_packet_entitlement" validate constraint "partner_packet_entitlement_partner_id_fkey";

alter table "public"."partner_packet_entitlement" add constraint "partner_packet_entitlement_scope_nonempty_check" CHECK ((length(TRIM(BOTH FROM entitlement_scope)) > 0)) not valid;

alter table "public"."partner_packet_entitlement" validate constraint "partner_packet_entitlement_scope_nonempty_check";

alter table "public"."partner_records" add constraint "partner_records_access_mode_check" CHECK ((access_mode = ANY (ARRAY['open'::text, 'optional_code'::text, 'required_code'::text, 'invite_only'::text]))) not valid;

alter table "public"."partner_records" validate constraint "partner_records_access_mode_check";

alter table "public"."rcap_document_packets" add constraint "rcap_document_packets_remedy_type_check" CHECK (((remedy_type IS NULL) OR (remedy_type = ANY (ARRAY['expungement'::text, 'sealing'::text, 'needs_review'::text])))) not valid;

alter table "public"."rcap_document_packets" validate constraint "rcap_document_packets_remedy_type_check";

alter table "public"."rcap_persons" add constraint "rcap_persons_reserved_namespace_shape" CHECK ((((partner_slug = 'expungement-ai-consumer'::text) AND (match_key ~ '^consumer:[0-9a-f]{64}$'::text)) OR ((partner_slug <> 'expungement-ai-consumer'::text) AND (match_key !~ '^consumer:'::text)))) not valid;

alter table "public"."rcap_persons" validate constraint "rcap_persons_reserved_namespace_shape";

alter table "public"."rcap_screening_analytics_events" add constraint "rcap_screening_analytics_events_event_type_check" CHECK ((event_type = ANY (ARRAY['screening_started'::text, 'screening_completed'::text, 'eligibility_result_recorded'::text, 'guidance_only_result'::text, 'packet_ready_result'::text, 'packet_generated'::text, 'packet_overage_recorded'::text]))) not valid;

alter table "public"."rcap_screening_analytics_events" validate constraint "rcap_screening_analytics_events_event_type_check";

alter table "public"."rcap_screening_analytics_events" add constraint "rcap_screening_analytics_events_outcome_category_check" CHECK (((outcome_category IS NULL) OR (outcome_category = ANY (ARRAY['eligible_packet'::text, 'eligible_packet_with_caution'::text, 'guidance_only'::text, 'ineligible'::text, 'incomplete'::text])))) not valid;

alter table "public"."rcap_screening_analytics_events" validate constraint "rcap_screening_analytics_events_outcome_category_check";

alter table "public"."screening_sessions" add constraint "screening_sessions_attribution_source_check" CHECK (((attribution_source IS NULL) OR (attribution_source = ANY (ARRAY['partner_page'::text, 'partner_code'::text, 'consumer'::text])))) not valid;

alter table "public"."screening_sessions" validate constraint "screening_sessions_attribution_source_check";

alter table "public"."screening_sessions" add constraint "screening_sessions_partner_access_code_id_fkey" FOREIGN KEY (partner_access_code_id) REFERENCES partner_access_codes(id) ON DELETE SET NULL not valid;

alter table "public"."screening_sessions" validate constraint "screening_sessions_partner_access_code_id_fkey";

alter table "public"."rcap_intake_sessions" add constraint "rcap_intake_sessions_eligibility_signal_check" CHECK (((eligibility_signal IS NULL) OR (eligibility_signal = ANY (ARRAY['possible_pathway'::text, 'possible_expungement_path'::text, 'possible_sealing_path'::text, 'needs_rap_sheet'::text, 'needs_more_information'::text, 'likely_not_available'::text, 'human_review_recommended'::text, 'excluded_or_blocked_review_needed'::text, 'future_eligibility_update'::text])))) not valid;

alter table "public"."rcap_intake_sessions" validate constraint "rcap_intake_sessions_eligibility_signal_check";

alter table "public"."rcap_record_events" add constraint "rcap_record_events_record_type_check" CHECK ((record_type = ANY (ARRAY['intake_session'::text, 'document_packet'::text, 'partner_access_code'::text, 'partner_entitlement'::text, 'partner_onboarding'::text]))) not valid;

alter table "public"."rcap_record_events" validate constraint "rcap_record_events_record_type_check";
