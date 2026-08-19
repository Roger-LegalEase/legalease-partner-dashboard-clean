-- Forward-only step 6 of 8 in the Production schema upgrade.
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
-- Enables row level security on the 29 new tables and creates 51 new policies.
--
-- Nothing here disables RLS, unforces a forced table, or drops a policy. The one
-- forced-RLS table in the Production baseline stays forced: the repository inputs
-- create that table without FORCE when they build a database from empty, but
-- stacking them on the baseline leaves Production's stronger setting in place, and
-- this chain never weakens it.
--
-- Eight policies the repository inputs create with bare `create policy` already
-- exist in the baseline, identical in command, roles, USING and WITH CHECK. They
-- are not re-created here, so no table's access is momentarily absent.

alter table "public"."consumer_packet_payment_consumption" enable row level security;

alter table "public"."packet_credit_ledger" enable row level security;

alter table "public"."packet_delivery_events" enable row level security;

alter table "public"."packet_render_jobs" enable row level security;

alter table "public"."partner_access_codes" enable row level security;

alter table "public"."partner_email_deliveries" enable row level security;

alter table "public"."partner_onboarding" enable row level security;

alter table "public"."partner_onboarding_activity" enable row level security;

alter table "public"."partner_onboarding_agreements" enable row level security;

alter table "public"."partner_onboarding_artifact_reviews" enable row level security;

alter table "public"."partner_onboarding_artifact_versions" enable row level security;

alter table "public"."partner_onboarding_artifacts" enable row level security;

alter table "public"."partner_onboarding_assets" enable row level security;

alter table "public"."partner_onboarding_authorizations" enable row level security;

alter table "public"."partner_onboarding_change_request_internal_notes" enable row level security;

alter table "public"."partner_onboarding_change_requests" enable row level security;

alter table "public"."partner_onboarding_contacts" enable row level security;

alter table "public"."partner_onboarding_idempotency" enable row level security;

alter table "public"."partner_onboarding_integration_events" enable row level security;

alter table "public"."partner_onboarding_launch_approvals" enable row level security;

alter table "public"."partner_onboarding_launch_checks" enable row level security;

alter table "public"."partner_onboarding_planned_users" enable row level security;

alter table "public"."partner_onboarding_prefill_batches" enable row level security;

alter table "public"."partner_onboarding_prefill_values" enable row level security;

alter table "public"."partner_onboarding_report_recipients" enable row level security;

alter table "public"."partner_onboarding_sections" enable row level security;

alter table "public"."partner_onboarding_tasks" enable row level security;

alter table "public"."partner_packet_entitlement" enable row level security;

alter table "public"."rcap_screening_analytics_events" enable row level security;

create policy "partner_access_codes_select_internal_admin"
on "public"."partner_access_codes"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "partner_access_codes_select_own_partner"
on "public"."partner_access_codes"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));

create policy "partner_email_deliveries_select_internal_admin"
on "public"."partner_email_deliveries"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "partner_email_deliveries_select_own_partner"
on "public"."partner_email_deliveries"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));

create policy "rcap_onboarding_entitlement_select_internal"
on "public"."partner_entitlement"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "rcap_onboarding_entitlement_select_partner"
on "public"."partner_entitlement"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));

create policy "partner_onboarding_insert_internal_admin"
on "public"."partner_onboarding"
as permissive
for insert
to authenticated
with check (is_internal_admin());

create policy "partner_onboarding_select_internal_admin"
on "public"."partner_onboarding"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "partner_onboarding_select_own_partner"
on "public"."partner_onboarding"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));

create policy "partner_onboarding_update_internal_admin"
on "public"."partner_onboarding"
as permissive
for update
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_activity_all_internal"
on "public"."partner_onboarding_activity"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_activity_select_partner"
on "public"."partner_onboarding_activity"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_activity.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_agreements_all_internal"
on "public"."partner_onboarding_agreements"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_agreements_select_partner"
on "public"."partner_onboarding_agreements"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_agreements.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_artifact_reviews_all_internal"
on "public"."partner_onboarding_artifact_reviews"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_artifact_reviews_select_partner"
on "public"."partner_onboarding_artifact_reviews"
as permissive
for select
to authenticated
using (((reviewer_type = 'partner'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_artifact_reviews.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_artifact_versions_all_internal"
on "public"."partner_onboarding_artifact_versions"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_artifact_versions_select_partner"
on "public"."partner_onboarding_artifact_versions"
as permissive
for select
to authenticated
using (((generation_status = 'succeeded'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_artifact_versions.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_artifacts_all_internal"
on "public"."partner_onboarding_artifacts"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_artifacts_select_partner"
on "public"."partner_onboarding_artifacts"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_artifacts.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_assets_all_internal"
on "public"."partner_onboarding_assets"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_assets_select_partner"
on "public"."partner_onboarding_assets"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_assets.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_authorizations_all_internal"
on "public"."partner_onboarding_authorizations"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_authorizations_select_partner"
on "public"."partner_onboarding_authorizations"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_authorizations.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_change_request_notes_all_internal"
on "public"."partner_onboarding_change_request_internal_notes"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_change_requests_all_internal"
on "public"."partner_onboarding_change_requests"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_change_requests_select_partner"
on "public"."partner_onboarding_change_requests"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_change_requests.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_change_requests_update_partner_admin"
on "public"."partner_onboarding_change_requests"
as permissive
for update
to authenticated
using (((status = ANY (ARRAY['open'::text, 'partner_responded'::text])) AND (current_partner_role() = 'partner_admin'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_change_requests.workspace_id) AND (po.partner_slug = current_partner_slug()))))))
with check (((status = 'partner_responded'::text) AND (current_partner_role() = 'partner_admin'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_change_requests.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_contacts_all_internal"
on "public"."partner_onboarding_contacts"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_contacts_select_partner"
on "public"."partner_onboarding_contacts"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_contacts.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_idempotency_all_internal"
on "public"."partner_onboarding_idempotency"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_integration_events_all_internal"
on "public"."partner_onboarding_integration_events"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_launch_approvals_all_internal"
on "public"."partner_onboarding_launch_approvals"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_launch_approvals_select_partner"
on "public"."partner_onboarding_launch_approvals"
as permissive
for select
to authenticated
using (((reviewer_type = 'partner'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_launch_approvals.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_launch_checks_all_internal"
on "public"."partner_onboarding_launch_checks"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_launch_checks_select_partner"
on "public"."partner_onboarding_launch_checks"
as permissive
for select
to authenticated
using (((owner_type = 'partner'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_launch_checks.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_planned_users_all_internal"
on "public"."partner_onboarding_planned_users"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_planned_users_select_partner"
on "public"."partner_onboarding_planned_users"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_planned_users.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_prefill_batches_all_internal"
on "public"."partner_onboarding_prefill_batches"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_prefill_values_all_internal"
on "public"."partner_onboarding_prefill_values"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_prefill_values_select_applied_partner"
on "public"."partner_onboarding_prefill_values"
as permissive
for select
to authenticated
using (((review_status = 'applied'::text) AND (EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_prefill_values.workspace_id) AND (po.partner_slug = current_partner_slug()))))));

create policy "partner_onboarding_report_recipients_all_internal"
on "public"."partner_onboarding_report_recipients"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_report_recipients_select_partner"
on "public"."partner_onboarding_report_recipients"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_report_recipients.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_sections_all_internal"
on "public"."partner_onboarding_sections"
as permissive
for all
to authenticated
using (is_internal_admin())
with check (is_internal_admin());

create policy "partner_onboarding_sections_select_internal"
on "public"."partner_onboarding_sections"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "partner_onboarding_sections_select_partner"
on "public"."partner_onboarding_sections"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM partner_onboarding po
  WHERE ((po.id = partner_onboarding_sections.workspace_id) AND (po.partner_slug = current_partner_slug())))));

create policy "partner_onboarding_tasks_select_internal_admin"
on "public"."partner_onboarding_tasks"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "partner_onboarding_tasks_select_own_partner"
on "public"."partner_onboarding_tasks"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));

create policy "rcap_persons_service_role_all"
on "public"."rcap_persons"
as permissive
for all
to service_role
using (true)
with check (true);

create policy "rcap_screening_analytics_select_internal_admin"
on "public"."rcap_screening_analytics_events"
as permissive
for select
to authenticated
using (is_internal_admin());

create policy "rcap_screening_analytics_select_own_partner"
on "public"."rcap_screening_analytics_events"
as permissive
for select
to authenticated
using ((partner_slug = current_partner_slug()));
