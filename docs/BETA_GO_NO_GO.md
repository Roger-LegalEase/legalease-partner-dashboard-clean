# Beta Go / No-Go

Status values: `pending`, `pass`, `fail`, `blocked`, `waived`.

| Gate | Requirement | Status | Evidence / Link | Owner | Blocker | Notes |
|---|---|---:|---|---|---:|---|
| Engineering | `npm run validate` passes | pass | Local Task 16 run | Engineering | no | Includes lint, typecheck, tests |
| Engineering | CI workflow configured | pass | `.github/workflows/ci.yml` | Engineering | no | Uses fake provider env vars |
| Staging smoke | `SMOKE_STRICT=true npm run smoke:staging` passes in staging | blocked | `docs/STAGING_INFRASTRUCTURE_HANDOFF.md` | Engineering | yes | Requires real staging app, DB, Redis, and secrets |
| Stripe | Test-mode products/prices configured | blocked | Stripe dashboard | Payments owner | yes | Requires Stripe dashboard access |
| Stripe | Checkout, portal, webhook, subscription cancel tested | blocked | Stripe test events | Payments owner | yes | Requires staging app and Stripe test-mode dashboard access. Monitoring purchase can remain disabled |
| Checkr | Sandbox API and webhook configured | blocked | Checkr dashboard | Provider ops | yes | Requires Checkr sandbox/dashboard access |
| Checkr | Report lifecycle simulated and redacted ProviderEvents verified | blocked | Admin ProviderEvent viewer | Provider ops | yes | Requires Checkr sandbox/test access. No raw payloads |
| OpenAI | Summary success and safe failure/retry tested | blocked | Admin case detail | Engineering | yes | Requires staging app/admin and `OPENAI_API_KEY` |
| Admin | Admin allowed and non-admin denied | blocked | Staging manual test | Operations | yes | Requires staging auth/admin setup |
| Admin | Audit timeline and redacted provider viewer load | blocked | Admin case detail | Operations | yes | Requires staging admin user and staging case data. No unnecessary PII |
| Beta access | Invite-only beta blocks non-approved users and allows approved users | blocked | Staging checkout test | Engineering | yes | First cohort remains capped at 5 users |
| Beta access | Monitoring purchase remains disabled for cohort 1 | blocked | Staging checkout/API test | Engineering | yes | `MONITORING_PURCHASE_ENABLED=false` |
| Legal/copy | Terms/privacy/beta/support/deletion placeholders reviewed | pending | Counsel review | Legal | yes | Not public until reviewed |
| Privacy/security | Redaction, webhook signature, beta gating, rate limiting verified | blocked | Tests pass; strict smoke pending | Security/engineering | yes | Redis and real signed webhook checks required in staging |
| Support | Support macros and escalation owners ready | pending | `BETA_COMMUNICATION_TEMPLATES.md` | Support owner | yes | Replace support email |
| Rollback | Flags and refund path rehearsed | blocked | `ROLLBACK_PLAN.md` | Operations | yes | Requires staging flag change rehearsal |
| Founder approval | First cohort approved | pending | Signoff | Founder | yes | Cohort size max 5 |
