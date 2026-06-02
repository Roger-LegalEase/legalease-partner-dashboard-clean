# Phase 14 Onboarding Persistence

Phase 14 adds real partner onboarding persistence for the LegalEase Record-Clearing Access Program / Partner Journey OS.

Payment opens onboarding. Onboarding data saves to Supabase. Partner records then drive partner pages, dashboards, launch kits, and future reports.

## What Phase 14 Adds

- Durable onboarding profile fields on `partner_records`.
- A paid-partner onboarding form at `/partners/onboarding/[partnerSlug]`.
- `POST /api/partners/onboarding` for draft saves and final submissions.
- Supabase migration SQL for onboarding fields.
- Partner dashboard and internal admin visibility into onboarding state.
- A live onboarding write/readback verifier.

## Captured Fields

The onboarding profile captures organization, legal name, primary contact, website, organization type, program name, program description, target state/county/city, service area, expected monthly participants, expected launch date, referral sources, audience description, branding notes, logo URL, onboarding status, started timestamp, completed timestamp, and update timestamp.

## Draft vs Submitted

Draft saves use `onboardingStatus: in_progress` and allow incomplete fields.

Final submission uses `onboardingStatus: submitted` and requires:

- organization name
- primary contact name
- primary contact email
- target state or service area

When onboarding is first saved, `onboardingStartedAt` is set. When onboarding is submitted, `onboardingCompletedAt` is set.

## Payment Gate

Unpaid partners cannot submit onboarding. The API reads the partner record server-side and checks `paymentStatus`. It does not trust client-provided payment state.

This keeps the Phase 13 rule intact: no confirmed payment, no provisioning or onboarding submission.

## Onboarding Status

Supported statuses:

- `not_started`
- `in_progress`
- `submitted`
- `needs_review`
- `approved`

Submitted and approved profiles are shown as review-ready in internal admin views.

## Future Asset Inputs

The persisted partner profile is now the source for future partner pages, dashboard context, launch kits, and reports. Phase 14 does not auto-generate assets yet; it makes the input data durable and reviewable.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
npm run partners:verify-supabase-admin-write
npm run partners:verify-production-readiness
npm run partners:verify-stripe-readiness
npm run partners:verify-paid-provisioning
npm run partners:verify-onboarding-persistence
```

Apply the additive Supabase migration before using the live onboarding form:

```sql
-- supabase/phase-14-onboarding-persistence.sql
```

## Not Yet Built

- auto-generated partner assets
- CRM integration
- email sending
- production auth
- RLS policies
- production domain deployment
