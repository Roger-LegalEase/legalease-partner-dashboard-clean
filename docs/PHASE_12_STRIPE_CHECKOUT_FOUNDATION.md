# Phase 12 Stripe Checkout Foundation

Phase 12 adds the Stripe Checkout foundation for paid partner provisioning readiness. It does not activate full production payments or paid provisioning.

## What This Phase Adds

- A minimal server-only Stripe client utility.
- Partner package definitions for the Record-Clearing Access Program:
  - Starter Access Program
  - Community Access Program
  - County Access Program
- A package selection flow on `/partners/start`.
- `POST /api/partners/checkout` to create a Stripe Checkout Session in payment mode.
- `/partners/checkout/success` as the Stripe return page.
- `POST /api/stripe/webhook` with Stripe signature verification and a placeholder for Phase 13 provisioning activation.
- `npm run partners:verify-stripe-readiness` guardrails.

## Required Stripe Env Vars

Set these in `.env.local`:

```bash
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=...
```

Use Stripe test-mode values for this phase. Do not commit `.env.local`, and do not print Stripe secrets.

## Required Stripe Price Env Vars

Stripe price IDs are read from env so tracked files do not hardcode real price IDs:

```bash
STRIPE_PRICE_STARTER_ACCESS_PROGRAM=...
STRIPE_PRICE_COMMUNITY_ACCESS_PROGRAM=...
STRIPE_PRICE_COUNTY_ACCESS_PROGRAM=...
```

If a package price env var is missing, checkout creation fails gracefully with the missing env var name.

## How Checkout Works

1. A partner selects a package on `/partners/start`.
2. The browser posts the selected `packageId` to `POST /api/partners/checkout`.
3. The API validates the package, reads the matching Stripe price ID from env, and creates a Stripe Checkout Session with `mode: payment`.
4. Stripe redirects back to:

```text
NEXT_PUBLIC_APP_URL/partners/checkout/success?session_id={CHECKOUT_SESSION_ID}
```

5. Canceled checkout returns to:

```text
NEXT_PUBLIC_APP_URL/partners/start
```

Checkout metadata includes:

- `packageId`
- `partnerId` or `partnerSlug` when available
- `product: legalease-partner-journey-os`
- `program: record-clearing-access-program`

## Why Webhook Confirmation Is Required

The success URL only proves that a browser returned from Stripe. It does not prove payment completion. Provisioning should only activate after a verified Stripe webhook event, such as `checkout.session.completed`, confirms payment state from Stripe server-to-server.

## Why Query Params Are Not Payment Proof

Query params can be copied, edited, replayed, or opened without a completed payment. The app must not create partners, mark payment complete, or start provisioning from `session_id` alone.

## Commands To Verify

```bash
npm run lint
npm run typecheck
npm test
npm run partners:verify-supabase-live-read
npm run partners:verify-supabase-required-partners
npm run partners:verify-supabase-admin-write
npm run partners:verify-production-readiness
npm run partners:verify-stripe-readiness
```

Expected Stripe readiness success output:

```text
Stripe readiness verification passed.
Stripe env: configured
Stripe price IDs: configured
.env.local tracked: no
Tracked secrets found: no
Dashboard product boundary: record-clearing only
```

## Product Boundary

The Partner Journey OS dashboard remains limited to the Record-Clearing Access Program.

Allowed dashboard modules:

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

- paid provisioning activation
- CRM integration
- email sending
- production auth
- RLS policies
