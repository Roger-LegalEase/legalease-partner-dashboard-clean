# Staging Release Rehearsal

Use this runbook for the invite-only RecordShield beta rehearsal. Do not run it against production provider credentials. For external-console provisioning evidence, use `docs/STAGING_INFRASTRUCTURE_HANDOFF.md`.

## A. Infrastructure
- Current staging deployment status: pending. No real platform credentials or staging secrets were available from the local Codex workspace during Task 16.
- Task 16A handoff status: blocked pending external platform/provider access. Evidence table lives in `docs/STAGING_INFRASTRUCTURE_HANDOFF.md`.
- Recommended deployment target if none exists: Vercel project for the Next.js app, managed PostgreSQL, and Upstash Redis REST for rate limiting.
- Staging app URL: pending, expected format `https://<recordshield-staging-host>`.
- Staging dashboard/admin URL: pending, expected paths `${APP_BASE_URL}/dashboard` and `${APP_BASE_URL}/admin`.
- Deployment platform: pending, recommended Vercel or equivalent Next.js platform.
- Environment name: `staging`.
- Branch used for staging: pending, recommended `main` or `staging` with protected deploys.
- Database provider: pending, must be PostgreSQL with backups and encryption at rest.
- Redis provider: pending, must expose Redis-compatible REST URL/token.
- Expected deploy command: platform default Next.js build or `npm run build`.
- Expected build command: `npm run build`.
- Expected rollback command/path: platform rollback to previous successful deployment; keep flags available for immediate service rollback.
- `APP_BASE_URL`: exact HTTPS staging origin.
- Auth/admin: one named admin account configured; one non-admin test account configured.
- Required command: `SMOKE_STRICT=true npm run smoke:staging` from the staging runtime or CI environment with staging secrets.

### Environment Inventory
- `DATABASE_URL`
- `NODE_ENV=production` or platform equivalent
- `APP_ENV=staging` if supported
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_RECORD_CHECK`
- `STRIPE_PRICE_MONITORING_LITE_MONTHLY`
- `STRIPE_PRICE_MONITORING_LITE_ANNUAL`
- `STRIPE_PRICE_MONITORING_PLUS_MONTHLY`
- `CHECKR_API_KEY`
- `CHECKR_WEBHOOK_SECRET`
- `CHECKR_BASE_URL`
- `CHECKR_PACKAGE_SLUG`
- `CHECKR_WORK_LOCATION_COUNTRY`
- `CHECKR_WORK_LOCATION_STATE`
- `CHECKR_WORK_LOCATION_CITY`
- `OPENAI_API_KEY`
- `RATE_LIMIT_REDIS_REST_URL`
- `RATE_LIMIT_REDIS_REST_TOKEN`
- `BETA_ACCESS_ENABLED`
- `BETA_INVITE_ONLY`
- `BETA_MAX_USERS`
- `BETA_APPROVED_EMAILS` or `BETA_INVITE_CODES`
- `RECORD_CHECK_PURCHASE_ENABLED`
- `MONITORING_PURCHASE_ENABLED`
- `AI_SUMMARY_ENABLED`
- `ADMIN_RETRY_ENABLED`
- `DATA_DELETION_REQUEST_ENABLED`

### First-Cohort Beta Flags
```env
BETA_ACCESS_ENABLED=true
BETA_INVITE_ONLY=true
BETA_MAX_USERS=5
RECORD_CHECK_PURCHASE_ENABLED=true
MONITORING_PURCHASE_ENABLED=false
AI_SUMMARY_ENABLED=true
ADMIN_RETRY_ENABLED=true
DATA_DELETION_REQUEST_ENABLED=true
```

## B. Stripe Test Mode
- Create product: `Record Check + Expungement Readiness`, one-time price `$199`.
- Create product: `Monitoring Lite Monthly`, recurring `$14.99/month`.
- Create product: `Monitoring Lite Annual`, recurring `$149/year`.
- Create product: `Monitoring Plus Monthly`, recurring `$29.99/month`.
- Configure `STRIPE_PRICE_*` env vars from test-mode price IDs.
- Configure checkout test using a Stripe test card.
- Configure Customer Portal and verify portal session creation.
- Configure webhook endpoint: `${APP_BASE_URL}/api/stripe/webhook`.
- Subscribe webhook endpoint to checkout, invoice, and subscription events.
- Verify checkout completion creates/updates order and case only through webhook processing.
- Verify subscription activation and cancellation in test mode even if monitoring purchase remains disabled for cohort 1.

## C. Checkr Sandbox/Test Mode
- Configure `CHECKR_API_KEY`, `CHECKR_BASE_URL`, package slug, node custom ID if used, and work location.
- Configure webhook endpoint: `${APP_BASE_URL}/api/checkr/webhook`.
- Create a paid staging case and trigger hosted invitation creation.
- Complete or simulate hosted invitation lifecycle.
- Simulate report lifecycle events in sandbox/test mode.
- Verify provider candidate, invitation, and report IDs are stored.
- Verify `ProviderEvent` payloads are redacted and idempotent.

## D. OpenAI
- Configure `OPENAI_API_KEY`.
- Generate one AI summary from a safe normalized staging fixture.
- Force or mock one summary failure and confirm safe failure state.
- Retry from admin and confirm audit event.

## E. Rate Limiting
- Confirm Redis mode in strict smoke output.
- Confirm production memory fallback is not used in staging.
- Send invalid webhook attempts and confirm rate limiting applies.
- Replay valid signed webhook deliveries and confirm they are not blocked by the public route limiter and remain idempotent.

## F. Admin
- Confirm admin user can access `/admin`.
- Confirm non-admin user is denied.
- Confirm admin dashboard, case list, case detail, audit timeline, and redacted provider event viewer load.
- Confirm retry AI summary works.
- Confirm manual review flag and resolve actions work and audit.
- Confirm anonymization test removes or anonymizes personal fields while preserving non-PII audit/payment/compliance records.

## Strict Smoke Interpretation
- Pass: all required env vars present, Redis configured, database reachable, app/admin/dashboard reachable, auth/admin present.
- Fail: any missing required env, Redis missing in strict mode, DB unreachable, app/admin/dashboard unreachable, webhook secrets missing, or auth/admin missing.
- If local cannot reach staging secrets or network, run strict smoke in staging CI or directly in the staging runtime.

## Database Setup
1. Run `npm run db:generate`.
2. Run `npm run db:deploy`.
3. Verify connectivity with `SMOKE_STRICT=true npm run smoke:staging`.
4. Verify required tables exist using the database console or migration history table.
5. Create staging admin through the configured auth provider or the current dev-auth placeholder only if approved for staging.
6. Approve first beta users through `BETA_APPROVED_EMAILS` or private `BETA_INVITE_CODES`; do not grant admin permissions through invite codes.

## Stripe Test Mode Setup
- Webhook endpoint path: `/api/stripe/webhook`.
- Required events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Replay events from the Stripe test dashboard or Stripe CLI using the staging webhook endpoint.
- Verify receipt by checking redacted `ProviderEvent` rows and admin provider-event timeline.
- Confirm price IDs in env match Stripe test-mode prices; do not use live mode keys.

## Checkr Sandbox/Test Setup
- Webhook endpoint path: `/api/checkr/webhook`.
- Sandbox/test assumption: hosted invitation and report lifecycle are simulated or run in Checkr sandbox/test mode only.
- Simulate or trigger invitation and report events through Checkr sandbox tools or approved test webhook fixtures.
- Verify redacted events in admin provider-event viewer and confirm duplicate/out-of-order events are idempotent.

## Strict Smoke Execution Log
| Timestamp | Environment | Command | Result | Notes |
|---|---|---|---|---|
| Task 16 local | Local Codex workspace | `SMOKE_STRICT=true npm run smoke:staging` | fail | Real staging env unavailable locally; failed on missing `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN`; DB/app checks were not reached in strict mode. |

## Task 16 Local Validation Notes
- No real staging deployment target, staging secrets, Stripe dashboard, Checkr dashboard, Redis REST credentials, or staging database were available in this workspace.
- Local strict smoke cannot pass until run from the staging runtime/CI with real staging env vars.
- Local soft smoke passes with expected warnings for missing local Postgres and app reachability.

## Manual Staging Rehearsal Evidence
| Flow | Status | Evidence | Notes |
|---|---|---|---|
| Beta-approved user can access checkout | pending | Staging manual run | Requires real staging app/auth |
| Non-approved user blocked | pending | Staging manual run | Requires invite-only env |
| $199 Stripe test checkout completes | pending | Stripe test dashboard | Test mode only |
| Checkout webhook creates/reuses case shell | pending | Admin case timeline | Source of truth must be webhook |
| Checkr hosted invitation created | pending | Admin provider IDs | Sandbox/test mode only |
| User sees candidate-action-required status | pending | Dashboard | No raw provider payloads |
| Checkr status lifecycle updates case | pending | ProviderEvent + case status | Redacted events only |
| AI summary generates | pending | Admin summary status | Safe test fixture |
| Admin can view case timeline | pending | `/admin/cases/[id]` | Admin only |
| Provider events redacted | pending | Admin provider-event viewer | No raw payloads |
| Anonymization workflow works | pending | Admin action + DB verification | Preserve non-PII audit/payment records |
| Monitoring purchase disabled | pending | Checkout route/UI | Cohort 1 default |
| Rollback flags disable purchases | pending | Env flag test | `RECORD_CHECK_PURCHASE_ENABLED=false` |
