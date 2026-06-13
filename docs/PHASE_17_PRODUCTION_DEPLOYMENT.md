# Phase 17: Production Deployment Readiness

Phase 17 prepares the LegalEase Partner Journey OS for launch at:

```text
https://www.legaleasepartner.com
```

The deployment target is the LegalEase Record-Clearing Access Program partner platform. It is independent of the consumer-facing Expungement.ai funnel.

## Recommended Hosting Steps

Vercel is the recommended deployment path for the current Next.js app.

1. Connect `Roger-LegalEase/legalease-partner-dashboard-clean`.
2. Deploy branch `main`.
3. Set production env vars in the hosting dashboard.
4. Add `www.legaleasepartner.com` as the production domain.
5. Verify HTTPS and canonical production URL behavior.

## Production Env Var Checklist

Use `.env.example` as the non-secret checklist.

Required production URL:

```bash
NEXT_PUBLIC_APP_URL=https://www.legaleasepartner.com
```

Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENABLE_SUPABASE_PARTNER_DATA=true
```

Stripe:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
Stripe invoice billing is custom-scoped; fixed partner price env vars are intentionally not part of the current model.
```

Email:

```bash
ENABLE_PARTNER_EMAIL_DELIVERY=false
PARTNER_EMAIL_PROVIDER=resend
RESEND_API_KEY=
PARTNER_EMAIL_FROM=
PARTNER_EMAIL_REPLY_TO=
INTERNAL_LEGALEASE_NOTIFICATIONS_EMAIL=
```

Production protection:

```bash
INTERNAL_ADMIN_ACCESS_TOKEN=
PARTNER_PREVIEW_ACCESS_TOKEN=
```

## Supabase Production Project Check

- Confirm `partner_records`, `partner_assets`, `partner_metrics`, `partner_events`, and `partner_email_deliveries` exist.
- Confirm required partners exist: `demo-partner`, `we-must-vote`, and `fulton-county`.
- Confirm partner data reads and writes work with service role access.
- Do not add full RLS policies in this phase.

## Stripe Production Setup Checklist

- Keep partner billing invoice-only until reviewed.
- Do not create public fixed-tier Checkout prices for partner sales.
- Set live `STRIPE_SECRET_KEY`.
- Set live `STRIPE_WEBHOOK_SECRET`.
- Configure the production webhook endpoint.

## Production Webhook Checklist

Production Stripe webhook endpoint:

```text
https://www.legaleasepartner.com/api/stripe/webhook
```

Stripe setup:

- Listen for `checkout.session.completed`.
- Use the live `STRIPE_WEBHOOK_SECRET`.
- Confirm the webhook updates partner payment state to `paid`.
- Confirm paid webhook activation moves provisioning to `ready_for_onboarding`.
- Test the live webhook in the Stripe dashboard before public launch.

## Email Delivery Setup Checklist

- Leave `ENABLE_PARTNER_EMAIL_DELIVERY=false` until live sending is approved.
- Configure `PARTNER_EMAIL_PROVIDER=resend`.
- Configure `RESEND_API_KEY`.
- Configure `PARTNER_EMAIL_FROM`.
- Configure optional reply-to and internal notification recipients.
- Preview templates from internal admin pages.
- Use dry-run records before turning on live delivery.

## Internal Admin Token Setup

Internal routes are protected in production by `INTERNAL_ADMIN_ACCESS_TOKEN`.

Use:

```text
Authorization: Bearer <token>
```

If the token is missing in production, internal routes fail closed.

## DNS Checklist

- Add `www.legaleasepartner.com` to the hosting provider.
- Configure DNS records requested by the hosting provider.
- Confirm HTTPS certificate issuance.
- Confirm redirects keep RCAP traffic on the LegalEasePartner production domain.
- Confirm RCAP pages do not default users into the consumer Expungement.ai funnel.

## Final QA Checklist

- Public partner pages load.
- Partner CTAs point to `/intake/[partnerSlug]`.
- Intake placeholder pages are safe and do not collect sensitive data.
- Document placeholder pages are safe and do not generate documents.
- Checkout uses production success and cancel URLs.
- Stripe webhook endpoint is configured.
- Email delivery remains disabled by default.
- Internal admin routes require a token in production.
- `.env.local` is not tracked.
- No secrets are committed.

## Rollback Checklist

- Disable production traffic at the hosting provider if needed.
- Revert to the prior stable deployment.
- Disable Stripe live checkout links if payment behavior is affected.
- Keep webhook endpoint active only if it points to a known good deployment.
- Preserve Supabase data; do not run destructive schema changes.

## Known Post-Launch Tasks

- RLS policies
- full production auth
- CRM integration
- RCAP Wilma eligibility chat
- RCAP document generator
- analytics
- monitoring
