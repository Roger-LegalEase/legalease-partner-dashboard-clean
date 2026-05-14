# Wilma Launch Checklist

Wilma determines whether a user appears to fit LegalEase's self-help document-preparation workflow. Wilma does not provide legal advice and does not guarantee expungement, sealing, nondisclosure, court approval, or legal eligibility.

## Required Verification

- `npm run typecheck` passes in CI or a clean clone.
- `npm test` passes in CI or a clean clone.
- `npm run lint` passes in CI or a clean clone.
- `node scripts/wilma-launch-readiness.mjs` passes in the target environment.
- `node scripts/wilma-smoke-test.mjs --manual` has been reviewed and the six-state matrix has been executed.

## Environment

- `DATABASE_URL` is configured for production.
- `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` point to the production LegalEase host.
- `NEXTAUTH_SECRET` is set.
- `OPENAI_API_KEY` is set server-side only.
- `OPENAI_MODEL` is reviewed.
- `STRIPE_SECRET_KEY` is set server-side only.
- `STRIPE_WEBHOOK_SECRET` is configured.
- `STRIPE_PRICE_RECORD_CHECK` and any existing checkout price configuration are reviewed.
- Wilma document-prep checkout metadata uses `product: "wilma_document_prep"` and `priceCents: 5000`.
- `BOT_PROTECTION_SECRET` is configured or the launch owner has explicitly accepted the fallback.
- `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` are configured for production rate limiting.
- `RATE_LIMIT_ALLOW_MEMORY_FALLBACK` is `false` in production.
- `WILMA_TRANSCRIPT_RETENTION_DAYS` is reviewed.
- `WILMA_STORE_RAW_TRANSCRIPTS` is `false` unless approved for an internal QA window.
- `ERROR_MONITORING_DSN` and `PRODUCTION_ALERT_WEBHOOK_URL` are configured.

## Security And Privacy

- `src/lib/env.ts` imports `server-only`.
- Client components do not import `@/lib/env`.
- The Wilma chat widget does not call OpenAI directly.
- `/api/wilma/payment-success` requires a verified provider webhook signature in production.
- Browser/client `paid: true` posts create no order, no documents, and no tracker.
- Admin routes require admin access:
  - `/admin/wilma`
  - `/admin/wilma/[sessionId]`
- Transcript data is visible only to admin/internal users.
- Analytics payloads store email hashes, not raw email.
- Webhook secrets, Stripe secrets, Redis tokens, and OpenAI keys are never written to analytics metadata.

## Funnel

- Free chat starts without account creation.
- Unsupported states return `outside_supported_scope`.
- Federal cases return no paid CTA.
- Pending cases return no paid CTA.
- Paid CTA is hidden until email is captured.
- Checkout is blocked unless the latest decision is `likely_eligible_for_document_prep` and email is captured.
- Checkout creation does not generate documents.
- Verified payment success creates exactly one Wilma order.
- Duplicate webhook replay does not create duplicate orders, documents, or trackers.
- Document/tracker handoff is configured and observable in admin.

## Payment Webhook Replay Test

- Create or use a staging Wilma checkout for a `likely_eligible_for_document_prep` session with captured email.
- Deliver one verified payment-success webhook event and confirm one order is created.
- Replay the same verified provider event and confirm no duplicate order, document-generation job, or tracker/workspace is created.
- Send a browser/client-style POST to `/api/wilma/payment-success` without the provider signature and confirm no payment, order, document, tracker, or fulfillment analytics events are emitted.
- Confirm wrong product, wrong amount, missing `wilmaSessionId`, missing email capture, and non-eligible session metadata are all blocked.

## Admin Audit Checklist

- `/admin/wilma` requires admin/internal access.
- `/admin/wilma/[sessionId]` requires admin/internal access.
- Session list filters do not expose sessions to anonymous or non-admin users.
- Transcript viewer does not show webhook secrets, payment provider secrets, raw OpenAI/system prompts, Redis tokens, or server env values.
- Detail view shows state, status, conversion, transcript, extracted facts, rule version, reason codes, risk flags, checkout/payment/order status, and document/tracker fulfillment status.
- Analytics event timeline includes checkout, verified payment, order, generation, tracker, and risk-flag events where applicable.

## Abuse Controls

- Message cap: 40 user messages per free screening.
- Session inactivity expiration: 24 hours.
- Repeated screening limits by email, IP, and device are enabled where backend data is available.
- Bot-protection hook is active.
- Rate-limit and abuse events are logged to Wilma analytics.
- Paid fulfillment and paid workspace access are not blocked by free-chat abuse controls.

## Monitoring And Alerts

- Alert on payment-success webhook verification failures above baseline.
- Alert on repeated fulfillment failures or `wilma_document_generation_failed` events.
- Alert when paid orders remain in `paid_pending_fulfillment` or `generating_documents` longer than the launch threshold.
- Alert on unusually high `unsupported_state`, `legal_advice_request`, `outcome_guarantee_request`, `court_prediction_request`, `rate_limit_hit`, or `bot_protection_failed` counts.
- Confirm production error monitoring captures Wilma route failures without logging PII or secrets.

## Rollout Flags

- Confirm `WILMA_PUBLIC_ENABLED` is set for the intended production surface.
- Confirm `WILMA_BETA_ONLY` is set correctly for beta-only launch.
- Confirm `WILMA_ALLOWED_STATES` matches the approved launch states.
- Confirm `WILMA_ROLLOUT_PERCENT` matches the launch cohort plan.
- Confirm `WILMA_MAINTENANCE_MODE` is off unless staging maintenance copy is being tested.
- Confirm `WILMA_KILL_SWITCH` is off before launch and documented for emergency shutdown.
- Confirm checkout handoff can be disabled without disabling free screening.
- Confirm paid fulfillment can be paused without accepting new paid checkouts.
- Confirm abuse controls are enabled before public traffic.
- Confirm admin access is available to the launch owner before rollout begins.

## Rollout

- Launch owner has reviewed state QA.
- Support/refund process is documented.
- Known limitations are published internally.
- Monitoring owner is assigned.
- Rollout starts with close admin audit review for the first production sessions.
