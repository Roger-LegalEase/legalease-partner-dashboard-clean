# Beta Launch Checklist

## A. Engineering
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run validate` passes.
- [ ] Staging smoke check passes in strict mode or soft warnings are documented.
- [ ] Full staging E2E runbook completed.
- [ ] Stripe and Checkr webhooks verified.
- [ ] Rate limiter provider is production-safe.
- [ ] Production environment validation passed.
- [ ] CSP reviewed in report-only mode before enforcement if needed.
- [ ] Admin access checked.
- [ ] ProviderEvent redaction verified.
- [ ] Data deletion/anonymization verified.
- [ ] `docs/VALIDATION_FAILURE_REPORT.md` reviewed for current known validation risks.
- [ ] CI workflow or equivalent CI steps configured from `docs/CI_VALIDATION.md`.
- [ ] `docs/STAGING_RELEASE_REHEARSAL.md` completed in staging.
- [ ] `SMOKE_STRICT=true npm run smoke:staging` passes in staging.

## B. Product
- [ ] Record Check + Expungement Readiness price verified at $199 one-time.
- [ ] Monitoring Lite verified at $14.99/month and $149/year.
- [ ] Monitoring Plus verified at $29.99/month.
- [ ] Beta flags configured.
- [ ] Invite-only flow tested.
- [ ] Onboarding copy reviewed.
- [ ] Email copy reviewed.
- [ ] Dashboard statuses reviewed.
- [ ] Support page live with production contact.
- [ ] `docs/FIRST_BETA_COHORT_PLAN.md` approved with cohort size 5.
- [ ] Monitoring purchase remains disabled for cohort 1 unless explicitly approved.
- [ ] `docs/BETA_COMMUNICATION_TEMPLATES.md` reviewed and support contact replaced.

## C. Compliance / Legal Review
- [ ] Terms reviewed.
- [ ] Privacy reviewed.
- [ ] Beta disclaimer reviewed.
- [ ] Consent language reviewed.
- [ ] Prohibited-use language reviewed.
- [ ] Data deletion language reviewed.
- [ ] AI disclaimer reviewed.
- [ ] Monitoring disclaimer reviewed.

## D. Operations
- [ ] Admin users configured.
- [ ] Support inbox configured.
- [ ] Escalation owner assigned.
- [ ] Provider support contacts documented.
- [ ] Stripe dashboard access configured.
- [ ] Checkr dashboard access configured.
- [ ] Incident process documented.
- [ ] `docs/INCIDENT_RESPONSE_RUNBOOK.md` reviewed by support and engineering.
- [ ] `docs/ROLLBACK_PLAN.md` rehearsed.
- [ ] `docs/BETA_GO_NO_GO.md` completed with owner signoff.

## E. Go / No-Go
- Final approver:
- Launch date:
- Beta cohort size:
- Rollback plan:
- Known issues:
- Owner signoff:
