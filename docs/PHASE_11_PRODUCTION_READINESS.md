# Phase 11 Production Readiness

Phase 11 adds production readiness guardrails for the LegalEase Partner Journey OS before payment-based provisioning is introduced.

## What This Phase Verifies

- Supabase partner reads are configured for live partner data.
- The existing partner admin action layer can persist a harmless write to Supabase for `demo-partner`.
- The admin write verification reads the partner back from Supabase, confirms the write persisted, and reverts the tested field to its original value.
- Required partner records are present:
  - `demo-partner`
  - `we-must-vote`
  - `fulton-county`
- `.env.local` exists locally, is ignored by git, and is not tracked.
- The Supabase service role key does not appear in tracked files.
- The partner dashboard product boundary remains record-clearing only.

## Why Stripe Waits

Stripe should not be added before Phase 11 passes because payment-based provisioning depends on a verified write path. Before payments can activate partner setup, we need confidence that the current admin layer can safely persist and verify partner state in Supabase without schema changes, leaked secrets, or product boundary drift.

## Required Environment Variables

Set these locally in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ENABLE_SUPABASE_PARTNER_DATA=true
```

Do not commit `.env.local`. Do not print or expose `SUPABASE_SERVICE_ROLE_KEY`.

## Commands

Run the full verification set:

```bash
npm run lint
npm run typecheck
npm test
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
npm run partners:verify-supabase-admin-write
npm run partners:verify-production-readiness
```

## Expected Success Outputs

Admin write verification:

```text
Supabase admin write verification passed.
Partner tested: demo-partner
Write confirmed: yes
Reverted: yes
```

Production readiness verification:

```text
Partner Journey OS production readiness verification passed.
Supabase env: configured
.env.local tracked: no
Required partners: present
Dashboard product boundary: record-clearing only
```

## Product Boundary

The Partner Journey OS dashboard is only for the Record-Clearing Access Program.

Approved dashboard modules:

- Wilma Intake
- RecordShield
- Expungement.ai
- Partner Dashboard
- Weekly Reports
- Final Impact Report

Do not reintroduce:

- StartApart
- ClaimCoach

## Not Yet Built

- Stripe
- CRM integration
- email sending
- production auth
- RLS policies
