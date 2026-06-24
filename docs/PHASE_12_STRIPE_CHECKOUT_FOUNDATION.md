# Phase 12 Stripe Billing Foundation

Historical note: this phase originally introduced Stripe Checkout scaffolding. The current LegalEase partner billing model is invoice-only.

## Current Model

LegalEase partner pricing is custom-scoped after discovery. Public fixed-tier checkout is intentionally unsupported.

Internal admins create scoped Stripe invoices after discovery and agreement. Partners can pay the Stripe-hosted invoice, but partners and public users cannot set amount, plan, tier, billing scope, or Stripe price ID.

## Required Stripe Env Vars

Set these in `.env.local`:

```bash
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_PARTNER_APP_URL=...
NEXT_PUBLIC_EXPUNGEMENT_AI_URL=...
```

Use Stripe test-mode values for development. Do not commit `.env.local`, and do not print Stripe secrets.

## Invoice Flow

1. A public partner prospect submits a discovery request.
2. LegalEase scopes the engagement.
3. An authenticated `internal_admin` creates the invoice from `/internal/billing/new`.
4. Stripe returns a hosted invoice URL after invoice finalization.
5. Payment state is reconciled only from verified Stripe invoice webhook events.

The public checkout API is disabled and returns `410`.

## Webhook Confirmation

The app verifies Stripe webhook signatures using the raw request body. Invoice state changes are idempotent through `processed_stripe_events`.

## Commands To Verify

```bash
npm run lint
npm run typecheck
npm test
npm run partners:verify-billing-readiness
npm run partners:verify-paid-provisioning
```
