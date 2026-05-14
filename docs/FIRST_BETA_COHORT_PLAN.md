# First Beta Cohort Plan

## Cohort
- Size: 5 users maximum.
- Access mode: invite-only.
- Monitoring: disabled for cohort 1.
- Launch date: TBD.
- Support owner: TBD.

## Invite Criteria
- Users understand this is a personal self-check beta.
- Users are willing to complete a provider-hosted invitation.
- Users can provide feedback within 7 days.
- Users are not trying to use the product for employment, tenant, credit, insurance, or eligibility decisions.

## Exclusions
- Employer screening, tenant screening, credit, insurance, suitability, ranking, approve/deny, or risk-scoring use cases.
- Users who need urgent legal representation.
- Users unwilling to use a provider-hosted flow.
- Users unwilling to accept beta limitations.

## Test Objective
Prove the core `$199` flow:
payment -> Checkr invitation -> report status -> AI summary -> expungement-readiness result -> admin support view -> anonymization/deletion workflow.

## Success Criteria
- 5 or fewer approved users can purchase.
- No non-approved user can purchase.
- Paid users receive exactly one Checkr invitation.
- Duplicate provider webhooks do not duplicate records or jobs.
- ProviderEvent payloads are redacted.
- Summary generation succeeds or fails safely with admin retry.
- Admin can view case timeline without unnecessary sensitive PII.
- Anonymization/deletion workflow is verified on a staging test user.
- No user-facing copy implies legal advice or eligibility decisions.

## Recommended Flags
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

## Rollback Conditions
- Payment succeeds but cases are not created.
- Checkr invitations duplicate or fail repeatedly.
- ProviderEvent redaction fails.
- Admin access control fails.
- AI summaries expose unsafe or unsupported claims.
- Data deletion/anonymization fails.
- Stripe or Checkr webhook verification is misconfigured.

## User Feedback Questions
- Was the beta positioning clear?
- Did the provider-hosted invitation step make sense?
- Did the dashboard explain current status clearly?
- Was the plain-English summary understandable?
- Did the expungement-readiness result feel cautious and useful?
- Did any copy feel alarming, definitive, or confusing?
- Did support respond with clear next steps?

## Communication Plan
- Send invite email with personal self-check framing and limitations.
- Send payment confirmation directing the user to complete the provider-hosted invitation.
- Send reminder only if the provider invitation is incomplete.
- Send report-ready message directing the user to log in.
- Collect feedback after the user reviews dashboard results.
- Keep monitoring waitlist/disabled note visible until cohort 2.
