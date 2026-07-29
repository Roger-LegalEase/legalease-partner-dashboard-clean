-- Phase 46: allow the media contact role on RCAP onboarding contacts.
--
-- The Operations and Escalation Plan has to name a media contact, and the brief
-- for this lane requires a dedicated role rather than overloading the
-- communications lead. `CONTACT_ROLES` in the application registry is the
-- vocabulary, but `partner_onboarding_contacts.role` is additionally pinned by a
-- CHECK constraint written in phase 43, so a role added in application code
-- alone validates in the portal and is then rejected by Postgres.
--
-- This is the smallest change that closes that gap. It creates no table, adds no
-- column, and grants no capability: it widens one CHECK constraint by a single
-- value. Existing rows all satisfy the wider constraint, so the rewrite cannot
-- fail on live data, and every other role is preserved exactly.
--
-- Forward-only and additive. Not applied to any remote database by this lane;
-- it has been applied only to a local loopback stack.
--
-- Apply after phase-45-rcap-onboarding-artifacts.sql.

begin;

alter table public.partner_onboarding_contacts
  drop constraint if exists partner_onboarding_contacts_role_check;

alter table public.partner_onboarding_contacts
  add constraint partner_onboarding_contacts_role_check
    check (role in (
      'executive_sponsor',
      'program_operator',
      'communications_lead',
      'reporting_evaluation_lead',
      'legal_services_referral_contact',
      'finance_procurement_contact',
      'technical_security_contact',
      -- Added by this migration. A press contact is not the program
      -- communications lead: the lead runs participant outreach, while this role
      -- answers media questions about the program.
      'media_contact'
    ));

comment on constraint partner_onboarding_contacts_role_check
  on public.partner_onboarding_contacts is
  'Contact role vocabulary. Must stay in step with CONTACT_ROLES in src/lib/partners/onboarding/schema.ts.';

commit;
