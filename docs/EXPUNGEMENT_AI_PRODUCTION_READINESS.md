# Expungement.ai Production Readiness

This document tracks launch-readiness items for the Expungement.ai consumer experience. It does not authorize deployment, migrations, live key changes, or production environment changes.

## Stripe hardening status

Stripe hardening is functionally complete for the current invoice/checkout safety posture.

Partner invoice Stripe flow remains unchanged. Expungement.ai consumer checkout plumbing is isolated from partner billing, partner dashboard behavior, partner auth/RLS, and partner invoice reconciliation.

The remaining Stripe launch step is switching/configuring the correct live keys and live price/checkout settings when ready. Do not switch from test keys to live keys until final go/no-go.

Verify the webhook secret and checkout success/cancel URLs before production launch.

## Support workflow status

Expungement.ai includes a public contact page and a technical support request workflow. The support API currently validates category, email, optional Briefcase item ID, and message; redacts SSN, full DOB, and full street address patterns from message text; then returns a dry-run/server-log-only response.

Live email sending and database persistence are not configured in this launch-polish patch.
