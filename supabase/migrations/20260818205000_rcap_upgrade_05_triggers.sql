-- Forward-only step 5 of 8 in the Production schema upgrade.
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
-- Creates 42 triggers. Each trigger function is created in step 02.

CREATE TRIGGER consumer_payment_consumption_binding_trg BEFORE INSERT OR UPDATE ON public.consumer_packet_payment_consumption FOR EACH ROW EXECUTE FUNCTION consumer_payment_consumption_binding_guard();

CREATE TRIGGER guard_packet_credit_ledger BEFORE INSERT OR DELETE OR UPDATE ON public.packet_credit_ledger FOR EACH ROW EXECUTE FUNCTION guard_packet_credit_ledger();

CREATE TRIGGER guard_packet_delivery_events BEFORE INSERT OR DELETE OR UPDATE ON public.packet_delivery_events FOR EACH ROW EXECUTE FUNCTION guard_packet_delivery_events();

CREATE TRIGGER guard_packet_render_job_delete BEFORE DELETE ON public.packet_render_jobs FOR EACH ROW EXECUTE FUNCTION guard_packet_render_job_delete();

CREATE TRIGGER guard_packet_render_job_insert BEFORE INSERT ON public.packet_render_jobs FOR EACH ROW EXECUTE FUNCTION guard_packet_render_job_insert();

CREATE TRIGGER guard_packet_render_job_transition BEFORE UPDATE ON public.packet_render_jobs FOR EACH ROW EXECUTE FUNCTION guard_packet_render_job_transition();

CREATE TRIGGER packet_render_jobs_consumer_binding_immutable_trg BEFORE UPDATE ON public.packet_render_jobs FOR EACH ROW EXECUTE FUNCTION packet_render_jobs_consumer_binding_immutable();

CREATE TRIGGER packet_render_jobs_paid_matter_finalize_trg BEFORE UPDATE OF status ON public.packet_render_jobs FOR EACH ROW WHEN (((new.partner_id IS NULL) AND (new.status = ANY (ARRAY['artifact_validated'::text, 'delivered'::text])))) EXECUTE FUNCTION packet_render_jobs_paid_matter_guard();

CREATE TRIGGER packet_render_jobs_paid_matter_insert_trg BEFORE INSERT ON public.packet_render_jobs FOR EACH ROW EXECUTE FUNCTION packet_render_jobs_paid_matter_guard();

CREATE TRIGGER set_partner_access_codes_updated_at BEFORE UPDATE ON public.partner_access_codes FOR EACH ROW EXECUTE FUNCTION set_partner_access_codes_updated_at();

CREATE TRIGGER rcap_onboarding_resolve_partner_record BEFORE INSERT OR UPDATE OF partner_slug, partner_record_id ON public.partner_onboarding FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_resolve_partner_record();

CREATE TRIGGER set_partner_onboarding_updated_at BEFORE UPDATE ON public.partner_onboarding FOR EACH ROW EXECUTE FUNCTION set_partner_onboarding_updated_at();

CREATE TRIGGER rcap_onboarding_activity_prevent_delete BEFORE DELETE ON public.partner_onboarding_activity FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_activity_prevent_update BEFORE UPDATE ON public.partner_onboarding_activity FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_validate_agreement_asset BEFORE INSERT OR UPDATE ON public.partner_onboarding_agreements FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_validate_agreement_asset();

CREATE TRIGGER partner_onboarding_artifacts_updated_at BEFORE UPDATE ON public.partner_onboarding_artifacts FOR EACH ROW EXECUTE FUNCTION set_partner_onboarding_artifact_updated_at();

CREATE TRIGGER rcap_onboarding_validate_asset_metadata BEFORE INSERT OR UPDATE ON public.partner_onboarding_assets FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_validate_asset_metadata();

CREATE TRIGGER rcap_onboarding_authorizations_prevent_delete BEFORE DELETE ON public.partner_onboarding_authorizations FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_authorization_mutation();

CREATE TRIGGER rcap_onboarding_authorizations_prevent_update BEFORE UPDATE ON public.partner_onboarding_authorizations FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_authorization_mutation();

CREATE TRIGGER rcap_onboarding_derive_authorization_actor BEFORE INSERT ON public.partner_onboarding_authorizations FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_derive_authorization_actor();

CREATE TRIGGER rcap_onboarding_change_request_notes_prevent_delete BEFORE DELETE ON public.partner_onboarding_change_request_internal_notes FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_change_request_notes_prevent_update BEFORE UPDATE ON public.partner_onboarding_change_request_internal_notes FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_guard_change_request_update BEFORE UPDATE ON public.partner_onboarding_change_requests FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_change_request_update();

CREATE TRIGGER rcap_onboarding_validate_change_request_section BEFORE INSERT OR UPDATE OF section_id, workspace_id ON public.partner_onboarding_change_requests FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_validate_change_request_section();

CREATE TRIGGER rcap_onboarding_guard_contact_mutation BEFORE UPDATE ON public.partner_onboarding_contacts FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_partner_row_mutation();

CREATE TRIGGER rcap_onboarding_derive_idempotency_actor BEFORE INSERT ON public.partner_onboarding_idempotency FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_derive_idempotency_actor();

CREATE TRIGGER rcap_onboarding_guard_idempotency_update BEFORE UPDATE ON public.partner_onboarding_idempotency FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_idempotency_update();

CREATE TRIGGER rcap_onboarding_integration_events_prevent_delete BEFORE DELETE ON public.partner_onboarding_integration_events FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_integration_events_prevent_update BEFORE UPDATE ON public.partner_onboarding_integration_events FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_prevent_append_only_mutation();

CREATE TRIGGER rcap_onboarding_validate_event_workspace BEFORE INSERT ON public.partner_onboarding_integration_events FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_validate_event_workspace();

CREATE TRIGGER partner_onboarding_launch_checks_updated_at BEFORE UPDATE ON public.partner_onboarding_launch_checks FOR EACH ROW EXECUTE FUNCTION set_partner_onboarding_launch_check_updated_at();

CREATE TRIGGER rcap_onboarding_guard_planned_user_mutation BEFORE UPDATE ON public.partner_onboarding_planned_users FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_partner_row_mutation();

CREATE TRIGGER set_partner_onboarding_prefill_batches_updated_at BEFORE UPDATE ON public.partner_onboarding_prefill_batches FOR EACH ROW EXECUTE FUNCTION set_partner_onboarding_prefill_updated_at();

CREATE TRIGGER rcap_onboarding_guard_report_recipient_mutation BEFORE UPDATE ON public.partner_onboarding_report_recipients FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_partner_row_mutation();

CREATE TRIGGER rcap_onboarding_validate_recipient_contact BEFORE INSERT OR UPDATE OF contact_id, workspace_id ON public.partner_onboarding_report_recipients FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_validate_recipient_contact();

CREATE TRIGGER rcap_onboarding_guard_section_mutation BEFORE UPDATE ON public.partner_onboarding_sections FOR EACH ROW EXECUTE FUNCTION rcap_onboarding_guard_section_mutation();

CREATE TRIGGER set_partner_onboarding_tasks_updated_at BEFORE UPDATE ON public.partner_onboarding_tasks FOR EACH ROW EXECUTE FUNCTION set_partner_onboarding_updated_at();

CREATE TRIGGER set_partner_packet_entitlement_updated_at BEFORE UPDATE ON public.partner_packet_entitlement FOR EACH ROW EXECUTE FUNCTION set_partner_packet_entitlement_updated_at();

CREATE TRIGGER rcap_guard_reserved_partner_slug_trg BEFORE INSERT OR UPDATE OF partner_slug ON public.partner_records FOR EACH ROW EXECUTE FUNCTION rcap_guard_reserved_partner_slug();

CREATE TRIGGER rcap_screening_analytics_prevent_delete BEFORE DELETE ON public.rcap_screening_analytics_events FOR EACH ROW EXECUTE FUNCTION prevent_rcap_screening_analytics_mutation();

CREATE TRIGGER rcap_screening_analytics_prevent_update BEFORE UPDATE ON public.rcap_screening_analytics_events FOR EACH ROW EXECUTE FUNCTION prevent_rcap_screening_analytics_mutation();

CREATE TRIGGER rcap_screening_started_event AFTER INSERT ON public.screening_sessions FOR EACH ROW EXECUTE FUNCTION emit_rcap_screening_started_event();
