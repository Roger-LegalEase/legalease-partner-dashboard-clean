# Phase 16: Safe Partner Email Delivery

Phase 16 adds the foundation for partner email delivery without turning on live email sending by default.

The system can now render partner onboarding and launch emails, preview them internally, record dry-run delivery attempts, and store email delivery records in Supabase when partner data persistence is enabled.

## Email Types

Phase 16 includes templates for:

- payment_confirmation
- onboarding_next_steps
- launch_kit_ready
- dashboard_ready
- partner_page_ready
- internal_partner_notification
- weekly_report_ready
- final_report_ready

Each template returns a subject, plain text body, and basic HTML body. The copy uses record-clearing access program language and avoids legal advice, eligibility promises, filing promises, or outcome promises.

## Dry-Run Behavior

Dry-run is the default operating model. Missing email env vars do not break the app.

Preview mode renders a template and does not write a delivery record.

Dry-run mode validates the partner and recipient, renders the email, and records a `dry_run` delivery record when Supabase writes are enabled. It does not send a live email.

Send mode only sends when live delivery is explicitly enabled and configured. If live delivery is disabled or incomplete, the system records a safe `skipped` record instead of sending.

## Live Sending Requirements

Live sending remains disabled unless all required settings are present:

```bash
ENABLE_PARTNER_EMAIL_DELIVERY=true
PARTNER_EMAIL_PROVIDER=resend
RESEND_API_KEY=...
PARTNER_EMAIL_FROM=...
```

Optional settings:

```bash
PARTNER_EMAIL_REPLY_TO=...
INTERNAL_LEGALEASE_NOTIFICATIONS_EMAIL=...
NEXT_PUBLIC_APP_URL=...
```

Do not commit email secrets. The app never prints `RESEND_API_KEY`.

## Why Live Sending Is Disabled By Default

Phase 16 prepares delivery infrastructure but does not make production communication automatic. This prevents accidental emails during setup, migration, testing, and internal review.

Production live sending should be enabled only after domain, auth, webhook, and operations checks are complete.

## Delivery Records

Supabase migration:

```bash
supabase/phase-16-email-delivery.sql
```

Delivery records store safe metadata:

- partner slug
- email type
- recipient email and name
- subject
- status
- provider
- provider message id
- preview URL
- sent, failed, created, and updated timestamps
- error message when applicable

The table does not store provider secrets.

## Internal Previews

Internal preview routes:

```bash
/internal/partners/admin/[partnerSlug]/emails
/internal/partners/admin/[partnerSlug]/emails/[emailType]
```

The preview pages show the subject, plain text body, rendered HTML, delivery mode, provider status, and a dry-run action. The dry-run action records a delivery attempt without sending a live email.

API route:

```bash
POST /api/internal/partners/send-email
```

Supported modes:

- preview
- dry_run
- send

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
npm run partners:verify-partner-landing-pages
npm run partners:verify-email-delivery
```

## Known Not Yet Built

- production auth
- RLS policies
- production domain deployment
- production Stripe webhook setup
- CRM integration
