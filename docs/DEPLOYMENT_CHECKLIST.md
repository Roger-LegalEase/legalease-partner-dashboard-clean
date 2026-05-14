# LegalEase RecordShield Deployment Checklist

## Environment
- Set production `DATABASE_URL` to a PostgreSQL database with backups and encryption at rest.
- Set `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` to the production HTTPS origin.
- Set `NEXTAUTH_SECRET` or the replacement auth secret before production boot.
- Set Stripe, Checkr, and OpenAI secrets in the deployment secret manager only.
- Leave `DEV_AUTH_EMAIL` unset in production unless an explicit break-glass process approves it.
- Confirm Stripe price IDs match production products for record check and monitoring plans.
- Confirm Checkr package slug, node custom ID, and work location values are production-approved.
- Configure `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN`; production fails closed without Redis unless `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true`.
- Configure beta flags: `BETA_ACCESS_ENABLED`, `BETA_INVITE_ONLY`, `BETA_MAX_USERS`, `BETA_APPROVED_EMAILS`, `BETA_INVITE_CODES`, purchase flags, `AI_SUMMARY_ENABLED`, `ADMIN_RETRY_ENABLED`, and `DATA_DELETION_REQUEST_ENABLED`.
- Keep invite codes and approved beta lists server-side only.
- For first beta cohort, use `BETA_MAX_USERS=5` and keep `MONITORING_PURCHASE_ENABLED=false`.

## Database
- Run `npm run db:deploy` during deployment.
- Verify migrations have applied before routing traffic.
- Confirm no schema or app flow stores SSNs, full DOBs, driver license numbers, or raw background report payloads.
- Confirm database backups, retention, and deletion workflows match the privacy policy.

## Security
- Confirm HTTPS is enforced by the hosting platform.
- Confirm security headers are present on app responses.
- Configure provider webhook endpoint allowlists or WAF rules when the hosting platform supports them.
- Confirm Redis-backed rate limiting is active for public checkout routes and invalid webhook attempts.
- Confirm valid signed Stripe and Checkr webhook retries are not blocked by public user-route limits.
- Confirm Stripe and Checkr webhooks reject invalid signatures.
- Confirm logs are routed through a processor that preserves redaction and blocks sensitive payload capture.

## Privacy Operations
- Document the intake path for data deletion and anonymization requests.
- Run the anonymization service from an authenticated admin or back-office workflow only.
- Confirm deleted users cannot be re-identified from support notes, Wilma chat content, product orders, entitlements, or provider candidate rows.
- Keep audit events for operational accountability without sensitive payloads.

## Monitoring
- Alert on webhook verification failures, repeated rate-limit denials, and missed Checkr report completion thresholds.
- Alert on failed Stripe webhook processing and payment entitlement drift.
- Monitor OpenAI summary failures separately from deterministic expungement-readiness results.

## Release
- Complete the Task 16A staging provisioning handoff in `docs/STAGING_INFRASTRUCTURE_HANDOFF.md` before marking real staging gates as passed.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run validate`.
- Run `npm run smoke:staging` against the staging base URL.
- Run `SMOKE_STRICT=true npm run smoke:staging` from staging CI/runtime before go/no-go.
- Smoke test checkout session creation, billing portal access, Checkr invitation creation, Stripe webhook handling, Checkr webhook handling, admin case actions, and dashboard rendering.
- Complete `docs/BETA_LAUNCH_CHECKLIST.md`.
- Complete `docs/BETA_GO_NO_GO.md`.
- Confirm rollback flags in `docs/ROLLBACK_PLAN.md` can be applied quickly.
- Review `docs/CI_VALIDATION.md` and confirm CI uses fake provider env vars for unit tests.
- If local validation behaves oddly, run `npm run clean:validation`, verify disk space, and consult `docs/VALIDATION_FAILURE_REPORT.md`.
- Confirm counsel has reviewed `/terms`, `/privacy`, `/beta-disclaimer`, support copy, consent copy, AI disclaimers, monitoring disclaimers, and data deletion language before public launch.

## Staging Launch Sequence
1. Provision the staging deployment platform, Postgres, Redis REST provider, Stripe test mode, Checkr sandbox/test mode, OpenAI key, and staging admin access using `docs/STAGING_INFRASTRUCTURE_HANDOFF.md`.
2. Configure all staging environment variables, including `NODE_ENV=production` or platform equivalent, `APP_ENV=staging` if supported, `APP_BASE_URL`, `NEXTAUTH_SECRET`, Stripe test-mode secrets, Checkr sandbox/test secrets, OpenAI, and Redis rate-limit secrets.
3. Run Prisma migrations with `npm run db:deploy`.
4. Configure Stripe products and prices for record check, monitoring lite monthly, monitoring lite annual, and monitoring plus monthly.
5. Configure the Stripe webhook endpoint and subscribe it to checkout, invoice, and subscription events.
6. Configure the Checkr webhook endpoint with `CHECKR_WEBHOOK_SECRET`.
7. Run `SMOKE_STRICT=true npm run smoke:staging` from staging CI/runtime and capture the output.
8. Run a Stripe checkout test and verify entitlement changes come only from webhooks.
9. Run a Checkr invitation test and verify LegalEase never collects SSN, full DOB, or driver license data.
10. Verify `ProviderEvent` payload redaction for Stripe and Checkr events.
11. Verify AI summary generation with a non-sensitive normalized report fixture.
12. Verify subscription cancellation and Customer Portal access.
13. Verify data deletion/anonymization against a staging test user.
14. Verify admin access controls for `/admin`, `/admin/cases`, and admin actions.
15. Review CSP in report-only mode before enforcing if staging surfaces third-party asset issues.
16. Capture strict smoke output and manual rehearsal evidence in `docs/STAGING_RELEASE_REHEARSAL.md` and update `docs/BETA_GO_NO_GO.md`.

## Launch Checks
- `npm run smoke:staging` checks required env vars and basic app/admin/dashboard reachability.
- Stripe dashboard checks should confirm checkout session creation, signed webhook delivery, duplicate delivery idempotency, and redacted `ProviderEvent` payloads.
- Checkr staging checks should confirm candidate/invitation creation, signed webhook delivery, duplicate delivery idempotency, and redacted `ProviderEvent` payloads.
- OpenAI checks should confirm summary generation succeeds and failures do not expose provider payloads in responses or logs.
- Database checks should confirm migrations are applied and backups are enabled.
- Email/notification checks should confirm configured providers can send operational alerts without sensitive payloads.

## Threat Model
- Assets: customer account identifiers, emails, case metadata, Checkr candidate/report metadata, payment entitlement state, Wilma chat facts, summaries, and audit logs.
- Primary threats: forged webhooks, replayed provider events, accidental sensitive data retention, over-broad admin access, checkout abuse, log leakage, and stale entitlements.
- Current mitigations: provider signature verification, idempotent `ProviderEvent` storage, role-gated admin pages/actions, redacted provider-event payloads, generic API errors, Redis-ready rate limiting with production fail-closed behavior, security headers, and deletion/anonymization service.
- Remaining production work: replace placeholder auth, add centralized audit/log monitoring, configure WAF or provider IP controls, and complete legal review for retention/deletion policy.
