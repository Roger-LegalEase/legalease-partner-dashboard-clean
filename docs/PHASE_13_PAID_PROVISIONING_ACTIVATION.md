# Phase 13 Paid Provisioning Activation

Phase 13 activates paid provisioning for the LegalEase Record-Clearing Access Program / Partner Journey OS.

Payment confirmation now updates partner payment and provisioning state. Payment unlocks onboarding. No confirmed payment means no provisioning.

## What Phase 13 Adds

- Payment/provisioning fields on partner records.
- Safe Supabase schema additions for Stripe checkout and payment identifiers.
- Checkout metadata for package, product, program, and partner context.
- Verified Stripe webhook handling for `checkout.session.completed`.
- Onboarding and launch-resource gates based on partner payment state.
- A paid provisioning verification script.

## Payment Status

Supported payment statuses:

- `unpaid`
- `checkout_started`
- `paid`
- `failed`
- `refunded`

`checkout_started` can be written when the app safely identifies the partner before creating a Stripe Checkout Session. It does not unlock onboarding.

Only `paid` unlocks onboarding.

## Provisioning Status

Supported provisioning statuses:

- `blocked_payment_required`
- `ready_for_onboarding`
- `onboarding_started`
- `provisioning_in_progress`
- `provisioned`

Unpaid partners remain `blocked_payment_required`. A verified paid checkout moves the partner to `ready_for_onboarding`.

## Webhook Confirmation

Only the verified Stripe webhook marks a partner paid. The webhook verifies the Stripe signature, handles `checkout.session.completed`, validates LegalEase metadata, requires Stripe `payment_status` to be `paid`, and then records:

- selected package
- Stripe Checkout Session ID
- Stripe customer ID when available
- Stripe PaymentIntent ID when available
- paid timestamp
- payment amount and currency
- `paymentStatus: paid`
- `provisioningStatus: ready_for_onboarding`

## Query Params Are Not Trusted

Checkout success query params can be copied, edited, replayed, or opened without payment. They are used only for display context. They do not mark payment complete and do not unlock provisioning.

## Full Access Naming

The public highest-tier package name is:

`Full Access Program`

The internal Stripe price env var remains:

`STRIPE_PRICE_COUNTY_ACCESS_PROGRAM`

This preserves Stripe readiness compatibility while updating public naming.

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
```

Apply the additive Supabase migration when updating a live database:

```sql
-- supabase/phase-13-paid-provisioning.sql
```

## Not Yet Built

- CRM integration
- email sending
- production auth
- RLS policies
- production Stripe webhook setup
