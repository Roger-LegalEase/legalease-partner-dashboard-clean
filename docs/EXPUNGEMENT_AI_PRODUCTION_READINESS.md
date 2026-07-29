# Expungement.ai Production Readiness

This document tracks launch-readiness items for the Expungement.ai consumer experience. It does not authorize deployment, migrations, live key changes, or production environment changes.

## Stripe hardening status

Stripe hardening is functionally complete for the current invoice/checkout safety posture.

Partner invoice Stripe flow remains unchanged. Expungement.ai consumer checkout plumbing is isolated from partner billing, partner dashboard behavior, partner auth/RLS, and partner invoice reconciliation.

The remaining Stripe launch step is switching/configuring the correct live keys and live price/checkout settings when ready. Do not switch from test keys to live keys until final go/no-go.

Production Stripe webhook URL:

- Preferred: `https://expungement.ai/api/stripe/webhook`
- Temporary compatibility route for the currently configured live Stripe endpoint: `https://expungement.ai/api/method/expungement.api.payment.stripe_webhook`

Both routes accept `POST`, verify Stripe signatures with the raw request body and `STRIPE_WEBHOOK_SECRET`, and reconcile paid Expungement.ai `checkout.session.completed` events back to the consumer Briefcase item before packet generation. Update the live Stripe webhook endpoint to the preferred URL before launch, then remove the compatibility route after Stripe no longer delivers to the legacy path.

Required payment environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_EXPUNGEMENT_AI_URL=https://expungement.ai`
- `NEXT_PUBLIC_APP_URL` or the production app URL used by the deployment

Verify the webhook secret and checkout success/cancel URLs before production launch.

## Support workflow status

Expungement.ai includes a public contact page and a technical support request workflow. The support API currently validates category, email, optional Briefcase item ID, and message; redacts SSN, full DOB, phone, email-in-body, and likely address patterns from message text; then creates or enqueues a LegalEase OS support item.

Live email sending is not configured in this launch-polish patch. Local development can return a clearly marked dryRun response if LegalEase OS persistence is unavailable, but production must not return success unless the request is persisted or enqueued to LegalEase OS.

## LegalEase OS product-event env

Expungement.ai product events use the server-only LegalEase OS event producer. Deploy environments that should emit product events must configure:

- `LEGALEASE_OS_EVENTS_ENABLED=true`
- `LEGALEASE_OS_EVENTS_ENDPOINT` with the LegalEase OS product event intake URL, such as `/api/events/product`
- `LEGALEASE_OS_LOOPS_ENDPOINT` with the OS-loops event intake URL, such as `/api/os-loops/events` (a different dialect; the two endpoints are not interchangeable)
- `LEGALEASE_OS_EVENTS_SECRET` with the shared HMAC secret for that intake

Do not expose these through `NEXT_PUBLIC_` variables, and do not commit real secret values. The drop-point nudge `screening_nudge_window` event uses the same endpoint, secret, and signing contract as the existing Expungement.ai product events. The OS side must accept the `screening_nudge_window` event type before those aggregate nudge events will be accepted.

## Support and correspondence routing

All support/contact submissions must create LegalEase OS support items.

Email address [info@legalease.law](mailto:info@legalease.law) remains customer-facing. The operating source of truth is LegalEase OS.

No support request should be accepted in production unless it is persisted or enqueued to LegalEase OS.

Partner users must not access consumer support correspondence.

Support items should be reviewed from internal LegalEase OS tooling.
