# Admin Operations Guide

## Access
- Sign in with an account that resolves to the `ADMIN` role.
- Open `/admin` for the operations overview and `/admin/cases` for case support.
- Do not share admin links or screenshots containing customer identifiers.
- The overview shows beta flag status. It must show counts only for approved emails and invite codes, never the code values.
- For cohort 1, confirm monitoring purchase is disabled and beta cohort size is capped at 5 before support begins.

## Case Statuses
- Pending payment: Stripe has not confirmed paid access.
- Paid: Stripe webhook confirmed payment.
- Invitation created: Checkr hosted invitation exists.
- Candidate action required: the customer must complete the hosted Checkr flow.
- Report pending: a provider report is not complete yet.
- Report complete: provider status indicates the report is complete.
- Summary ready: LegalEase has a validated plain-English summary.
- Summary failed: summary generation failed safely and can be retried.
- Manual review recommended: staff review is needed before support continues.
- Monitoring active: monitoring entitlement/enrollment is active.
- Monitoring canceled: monitoring is canceled or revoked.
- Anonymized: personal fields have been anonymized for a privacy request.

## Retry Failed AI Summaries
- Open the case detail page.
- Use “Retry AI summary” only when the summary is missing, failed, or operationally retryable.
- The retry uses safe structured output validation and stores either a valid summary or a safe failure state.
- Retry actions create audit events.

## Manual Review Flags
- Use “Mark manual review needed” with a short operational reason.
- Manual review does not change expungement-readiness output and must not be used as eligibility decisioning.
- Use “Resolve manual review” with a short resolution note when staff review is complete.

## Provider Event Redaction
- The provider event viewer shows provider, type, provider event ID, timestamp, processing status, dedupe status, and redacted payload preview.
- Never request or paste raw Checkr payloads into admin notes.
- If SSN, full DOB, driver license data, authorization tokens, or raw report payloads appear, stop and escalate before continuing.

## Deletion / Anonymization
- Confirm the customer request outside the console before triggering anonymization.
- Enter a reason and type `ANONYMIZE` in the confirmation field.
- The workflow anonymizes user-linked personal fields while preserving non-PII audit/payment/compliance records.
- Verify the case now shows `Anonymized customer` and no customer email.

## What Admins Must Not Do
- Do not use LegalEase for employment, tenant, credit, insurance, or eligibility decisioning.
- Do not approve, deny, rank, or score a person.
- Do not enter or store SSNs, full DOBs, driver license numbers, or raw provider payloads.
- Do not bypass Stripe or Checkr webhook verification.
- Do not tell a customer they are eligible or ineligible for expungement; use "may be ready," "may require review," or "not enough information."
- Do not treat placeholder terms, privacy, or beta pages as final counsel-approved legal documents.

## Beta Support Escalation
- Escalate to engineering if provider events appear unredacted, webhook status looks inconsistent, or local status refresh changes unexpectedly.
- Escalate to legal/compliance for state-law questions, eligibility concerns, or customer disputes.
- Escalate to operations lead for deletion/anonymization requests before triggering the action.
- Use `docs/BETA_SUPPORT_PLAYBOOK.md` for scenario-specific safe language and escalation paths.
- Use `docs/BETA_COMMUNICATION_TEMPLATES.md` for beta-safe email and support macros.
- Use `docs/INCIDENT_RESPONSE_RUNBOOK.md` for webhook, provider, database, Redis, admin-access, AI, and sensitive-data incidents.
- Use `docs/ROLLBACK_PLAN.md` if purchases, beta access, monitoring purchase, or AI summary must be paused.
