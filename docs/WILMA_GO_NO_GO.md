# Wilma Go/No-Go Gate

Use this gate after the staging rehearsal and before enabling Wilma for public production traffic.

Wilma is a self-help document-preparation screener. It does not provide legal advice, legal strategy, guarantees, court predictions, or a legal eligibility determination.

## Launch Decision

- Decision: Go / No-Go
- Launch owner:
- Engineering owner:
- Support owner:
- Monitoring owner:
- Date/time:
- Commit or release candidate:
- Staging rehearsal session IDs:

## Required Go Criteria

- Legal/copy approval is complete for the public widget, email gate, paid CTA, support language, and known limitations.
- Six-state QA is complete for IL, PA, MD, DC, MS, and TX.
- Disabled paths are documented and verified:
  - IL conviction sealing.
  - PA felony limited access.
  - MD guilty-disposition expungement.
  - DC conviction sealing and actual innocence.
  - MS felony expunction and trafficking-victim relief.
  - TX nondisclosure.
- Payment webhook verification is confirmed in staging.
- Fake/browser payment-success POST is rejected.
- Duplicate webhook replay is idempotent.
- Checkout is blocked unless latest decision is `likely_eligible_for_document_prep` and email is captured.
- Checkout product is `wilma_document_prep` and price is 5000 cents.
- Verified payment creates exactly one order.
- Document-generation handoff receives structured facts and decision metadata.
- Tracker/workspace handoff is created after verified payment.
- Admin access control is verified for `/admin/wilma` and `/admin/wilma/[sessionId]`.
- Admin detail shows transcript, facts, decision, risk flags, events, checkout/payment/order, and fulfillment status.
- Abuse controls are enabled for message cap, session expiration, IP/session/email limits, and bot protection.
- Refund/support path is ready and documented in `docs/WILMA_SUPPORT_AND_REFUNDS.md`.
- Known limitations are documented in `docs/WILMA_KNOWN_LIMITATIONS.md`.
- Monitoring/logging is ready and does not expose secrets or unnecessary PII.
- Production readiness script passes in the target environment.
- Rollback plan is reviewed.
- Feature flag rollout plan is approved.

## Monitoring Checklist

- Error monitoring is receiving Wilma route failures.
- Alerts exist for payment webhook verification failures.
- Alerts exist for fulfillment failures and stuck orders.
- Alerts exist for unusually high legal-advice, guarantee, court-prediction, unsupported-state, bot-protection, or rate-limit events.
- Logs redact webhook secrets, payment secrets, Redis tokens, OpenAI keys, and raw secret env values.

## Rollback Plan

- Disable public Wilma widget exposure.
- Disable checkout handoff if paid conversion must be paused.
- Keep verified payment webhook handling available for already-paid users unless the incident specifically affects fulfillment safety.
- Keep admin access available for audit and support.
- Post an internal incident note with affected session/order IDs.

## Feature Flag Rollout Plan

- Start with internal/staging users.
- Enable a small production cohort or limited traffic source.
- Review admin sessions and analytics after the first production runs.
- Expand only after checkout, payment, fulfillment, and support checks remain clean.
- Pause rollout immediately if any stop condition from `docs/WILMA_STAGING_REHEARSAL.md` appears.

## No-Go Reasons

Mark No-Go if any required criterion is incomplete, any stop condition is present, or any owner cannot support launch monitoring during the initial rollout window.
