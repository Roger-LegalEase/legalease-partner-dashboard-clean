# Incident Response Runbook

Keep communications privacy-safe. Do not include report details or provider payloads in tickets, email, or chat.

## Stripe Webhook Failure
- Detection: missing order/case after paid checkout, Stripe delivery failures.
- Severity: high.
- Immediate action: verify webhook secret, endpoint URL, delivery logs, and ProviderEvent records.
- User-safe communication: "We are reviewing payment confirmation and will update your dashboard."
- Owner: engineering + payments owner.
- Mitigation: pause purchases with `RECORD_CHECK_PURCHASE_ENABLED=false`.
- Postmortem: compare Stripe event IDs to ProviderEvent rows.

## Checkr Webhook Failure
- Detection: invitation/report status stale, Checkr delivery errors.
- Severity: high.
- Immediate action: verify `CHECKR_WEBHOOK_SECRET`, endpoint URL, signature failures, and ProviderEvent rows.
- User-safe communication: "Your provider status is being reviewed."
- Owner: engineering + provider operations.
- Mitigation: pause new invitations if status cannot be reconciled.
- Postmortem: document event IDs, dedupe status, and redaction verification.

## Duplicate Provider Events
- Detection: repeated event IDs or duplicate audit attempts.
- Severity: medium.
- Immediate action: confirm idempotency path and ProviderEvent uniqueness.
- User-safe communication: usually none unless user status is affected.
- Owner: engineering.
- Mitigation: do not manually delete events; reconcile local display state.
- Postmortem: confirm no duplicate charges, invitations, summaries, or jobs.

## AI Summary Outage
- Detection: summary failures spike, OpenAI errors, admin retry failures.
- Severity: medium.
- Immediate action: set `AI_SUMMARY_ENABLED=false`; cases should show manual review pending.
- User-safe communication: "Your summary needs additional review before it is shown."
- Owner: engineering.
- Mitigation: admin retry after provider recovers.
- Postmortem: review failure payload redaction and retry outcomes.

## Database Connection Issue
- Detection: strict smoke DB failure, app errors, Prisma connection errors.
- Severity: critical.
- Immediate action: keep admin/support informed; stop new purchases with `RECORD_CHECK_PURCHASE_ENABLED=false`.
- User-safe communication: "We are experiencing a service issue and will update you shortly."
- Owner: engineering/infrastructure.
- Mitigation: restore database connectivity or fail over according to hosting provider process.
- Postmortem: timeline, affected users, recovery steps.

## Redis / Rate-Limit Issue
- Detection: strict smoke Redis failure, unexpected rate-limit errors, invalid webhook bursts not throttled.
- Severity: high.
- Immediate action: restore Redis env vars or provider; do not enable production memory fallback unless explicitly approved.
- User-safe communication: usually none unless checkout is affected.
- Owner: engineering.
- Mitigation: pause public checkout routes if abuse risk is high.
- Postmortem: confirm valid signed webhook retries were not blocked.

## Admin Access Issue
- Detection: admin denied unexpectedly or non-admin gains access.
- Severity: critical if over-permissive, high if lockout.
- Immediate action: verify auth env and role mapping; stop admin actions if role enforcement is suspect.
- User-safe communication: none unless case support is delayed.
- Owner: engineering + operations lead.
- Mitigation: use break-glass admin only if approved.
- Postmortem: audit route/action access checks.

## Accidental Sensitive Data Exposure
- Detection: SSN, full DOB, driver license, raw provider payload, secret, or token appears in logs/admin/UI.
- Severity: critical.
- Immediate action: stop processing affected path, preserve evidence securely, remove exposure, rotate secrets if needed.
- User-safe communication: coordinate with counsel before external communication.
- Owner: security/privacy lead + counsel + engineering.
- Mitigation: disable affected feature flag and verify redaction tests.
- Postmortem: root cause, affected records, notification obligations.

## User Deletion Request Failure
- Detection: anonymization errors or personal fields remain after completion.
- Severity: high.
- Immediate action: pause completed-status communication, rerun workflow after fix, preserve audit.
- User-safe communication: "We are reviewing your request and will confirm once complete."
- Owner: operations + engineering + counsel for retention questions.
- Mitigation: manual review of personal fields if required.
- Postmortem: fields missed and service fix.

## Payment Succeeded But Case Not Created
- Detection: Stripe paid event without ProductOrder/ShieldCase.
- Severity: high.
- Immediate action: verify Stripe event, ProviderEvent, webhook processing, and idempotency logs.
- User-safe communication: "We are reconciling your payment and next steps."
- Owner: payments owner + engineering.
- Mitigation: pause purchases if repeated.
- Postmortem: reconcile every paid user.

## Checkr Invite Created But Not Visible
- Detection: ProviderInvitation exists but dashboard lacks link.
- Severity: medium.
- Immediate action: verify user email linkage, invitation URL, and dashboard query.
- User-safe communication: "We are checking the provider invitation link."
- Owner: engineering + support.
- Mitigation: admin confirms link status and reissues only if safe and non-duplicative.
- Postmortem: prevent duplicate provider orders.
