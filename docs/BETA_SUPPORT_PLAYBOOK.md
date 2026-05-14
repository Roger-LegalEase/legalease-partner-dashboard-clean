# Beta Support Playbook

LegalEase RecordShield beta is a consumer self-check flow. Do not use it for employment, tenant, credit, insurance, ranking, scoring, or eligibility decisions. Do not provide legal advice.

## Paid but no Checkr invite
- Check: Stripe checkout webhook, ProductOrder, ShieldCase, ProviderInvitation, audit timeline.
- Can say: "We are checking the provider invitation status and will update your dashboard."
- Must not say: "Your check is approved" or guarantee timing.
- Escalate: engineering if webhook/order records are missing.

## Invite created but not completed
- Check: ProviderInvitation status, invitation URL, latest provider event.
- Can say: "Please complete the secure provider-hosted invitation."
- Must not say: LegalEase can collect SSN, full DOB, or driver license data directly.
- Escalate: provider support if hosted link fails.

## Report stuck pending
- Check: report status, provider events, missed-webhook alert placeholder.
- Can say: "Timing can vary by provider availability, jurisdiction, court data, and reporting rules."
- Must not say: a final result is guaranteed by a specific date.
- Escalate: provider support after the beta threshold.

## Report complete but AI summary failed
- Check: summary status and retry availability in admin console.
- Can say: "The plain-English summary needs safe review or retry."
- Must not say: the report has no issues unless the summary is ready and verified.
- Escalate: engineering if retries fail repeatedly.

## User disputes provider data
- Check: redacted provider timeline and report status.
- Can say: "Please review the provider dispute process and consult a qualified attorney for legal advice."
- Must not say: LegalEase can change court/provider data directly.
- Escalate: provider support and counsel for sensitive disputes.

## User asks about expungement
- Check: expungement-readiness status and missing information.
- Can say: "The result may require attorney review and is not a final legal determination."
- Must not say: "You are eligible" or "You are not eligible."
- Escalate: counsel for legal questions.

## Cancellation or payment issue
- Check: Stripe customer, subscription status, billing portal, audit timeline.
- Can say: "Use the billing portal or support can review billing status."
- Must not say: cancellation removes all historical compliance records.
- Escalate: Stripe dashboard owner for payment errors.

## Deletion or anonymization request
- Check: data deletion workflow, anonymization status, audit log.
- Can say: "We can remove or anonymize supported personal fields; some non-personal billing, audit, or compliance records may be retained."
- Must not say: all records are always deleted instantly.
- Escalate: counsel for retention questions.

## User asks to use report for employment or housing
- Check: none needed beyond account identity.
- Can say: "RecordShield is only for personal self-review and must not be used for employment, tenant, credit, insurance, or eligibility decisions."
- Must not say: any suitability, ranking, approval, or denial guidance.
- Escalate: counsel if the request continues.

## Provider webhook failed or duplicated
- Check: ProviderEvent dedupe, redacted payload, processing status, audit timeline.
- Can say: "We are reviewing the status update pipeline."
- Must not expose: raw provider payloads.
- Escalate: engineering.

## Monitoring alert issue
- Check: monitoring status, subscription state, MonitoringAlert history.
- Can say: "Monitoring does not guarantee detection of every record or change."
- Must not say: monitoring is comprehensive.
- Escalate: provider support or engineering depending on source.
