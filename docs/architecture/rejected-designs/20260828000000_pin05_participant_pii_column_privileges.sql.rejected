-- ============================================================================
-- STATUS: NOT_APPLIED / TRANSITIONAL / NOT_ACCEPTED
-- DO NOT APPLY THIS MIGRATION TO ANY ENVIRONMENT.
--
-- Rejected 2026-08-28 by docs/architecture/adr/ADR-0001-participant-ownership-
-- and-the-claim-boundary.md. Retained as a diagnostic record only.
--
-- WHY IT IS REJECTED: it is inert. 20260728213131_remote_schema.sql lines
-- 3280-3308 issue GRANT ALL ON TABLE to both "anon" and "authenticated" on all
-- three tables touched below. In PostgreSQL a table-level SELECT grant permits
-- every column, so a column-level REVOKE layered on top changes no effective
-- privilege. This file reads as a fix and closes nothing.
--
-- The replacement corrects privileges at the grant layer per role -- anonymous,
-- participant, partner staff, partner administrator, internal administrator,
-- service operations -- before any policy is written, and proves effective
-- access against isolated PostgreSQL rather than by reading the SQL.
-- ============================================================================

-- PIN-05 — remove participant PII from partner-tenancy read access.
--
-- THREE TABLES, ONE SHAPE. rcap_intake_sessions, rcap_document_packets and
-- rcap_briefcase_items are durable participant records whose only row-level
-- read boundary is the sponsoring partner:
--
--   USING (partner_slug = public.current_partner_slug())
--
-- rcap_document_packets carries a nullable user_id, rcap_briefcase_items
-- carries a nullable user_id, and rcap_intake_sessions has no participant
-- column at all. So any principal holding an `authenticated` JWT whose
-- current_partner_slug() resolves to the sponsoring partner could read
-- petitioner names, email, phone, charge, cause number, offense and
-- disposition dates, and the generated pleading text itself.
--
-- The controlling product contract (docs/PRODUCT_CONTRACT.md) states that a
-- partner owns its program workspace and its own aggregate program data, and
-- does not own the participant's matter, Briefcase, packet or unrestricted
-- answers. Partner-tenancy access to these columns contradicts that.
--
-- WHY COLUMN PRIVILEGES RATHER THAN A NEW ROW POLICY.
--
-- Two facts decide the approach, both established by reading the consumers:
--
--   1. Every application read of these tables that carries participant data
--      goes through getSupabaseAdminClient() -- the service role -- which
--      bypasses RLS and is unaffected by grants to `authenticated`. Those are
--      src/lib/rcap/documents/source-repository.ts, src/lib/rcap-intake/
--      repository.ts and src/lib/rcap/person-identity.ts.
--
--   2. The one consumer that deliberately uses the RLS path,
--      src/lib/partners/partner-dashboard-rls-repository.ts via
--      createServerSupabaseAuthClient(), selects only:
--        rcap_intake_sessions   status, eligibility_signal, created_at, completed_at
--        rcap_document_packets  status, created_at
--        rcap_briefcase_items   id (count only)
--      It reads no participant PII at all.
--
-- Revoking column privileges therefore closes the exposure while leaving the
-- partner dashboard, the partner reporting path and the preserved legacy
-- generators (Mississippi, Illinois, DC, Pennsylvania, Texas-Harris -- note
-- rcap_document_packets.state defaults to 'MS') working exactly as before.
-- Tightening the row policy instead would break the dashboard's aggregate
-- counts, which are a legitimate partner entitlement.
--
-- This is a privilege reduction. It grants nothing and creates no object.

-- rcap_intake_sessions: participant identity and their described case.
revoke select (
  user_first_name,
  user_last_name,
  user_email,
  user_phone,
  record_type,
  charge_or_case_type,
  case_outcome,
  approximate_case_year,
  pathway_summary,
  suggested_next_step
) on table public.rcap_intake_sessions from authenticated;

-- rcap_document_packets: petitioner identity, the record itself, and the
-- generated pleading. generated_html and generated_plain_text are the filed
-- document's text and are the most sensitive columns in the schema.
revoke select (
  petitioner_first_name,
  petitioner_last_name,
  petitioner_city,
  petitioner_county,
  cause_number,
  charge,
  offense_date,
  arrest_date,
  arresting_agency,
  agency_case_number,
  disposition_date,
  conviction_date,
  sentence_completion_date,
  generated_html,
  generated_plain_text,
  filing_instructions,
  county_court_instructions,
  missing_fields
) on table public.rcap_document_packets from authenticated;

-- rcap_briefcase_items: the title names the participant's matter.
revoke select (
  title
) on table public.rcap_briefcase_items from authenticated;

-- Columns deliberately left readable, because the partner dashboard and
-- partner reporting depend on them and they carry no participant identity:
--   all three:             id, partner_slug, status, created_at, updated_at
--   intake_sessions:       current_step, state, county, eligibility_signal,
--                          legal_disclaimer_accepted, completed_at, person_id
--   document_packets:      state, county, court_*, jurisdiction, document_type,
--                          pathway, the boolean signal columns, relief_outcome,
--                          person_id, completed_at
--   briefcase_items:       item_type, state, county, document_type,
--                          last_opened_at
--
-- person_id is a pseudonymous join key, not an identifier, and
-- getRcapPersonOutcomeSummary depends on it for distinct-person counts.

comment on table public.rcap_intake_sessions is
  'RCAP partner intake. PIN-05: participant identity and case-description columns are revoked from the authenticated role; partner reads reach status and aggregate columns only. This table has no participant owner column -- see PIN-05 follow-up.';

comment on table public.rcap_document_packets is
  'RCAP generated packets, including the preserved legacy generators. PIN-05: petitioner identity, record facts and generated document text are revoked from the authenticated role. user_id is nullable -- see PIN-05 follow-up.';

comment on table public.rcap_briefcase_items is
  'RCAP briefcase items. PIN-05: title is revoked from the authenticated role. user_id is nullable -- see PIN-05 follow-up.';
