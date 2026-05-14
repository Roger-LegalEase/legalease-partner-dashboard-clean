# Wilma Support And Refunds

Wilma is an automated self-help document-preparation workflow. Support should not provide legal advice, legal strategy, guarantees, or court predictions.

## Support Escalation

Escalate to internal review when:

- The user says the wrong state, county, case number, or disposition was captured.
- The user paid but no order, document-generation job, or tracker was created.
- A duplicate charge or duplicate order is suspected.
- The user asks for legal advice, court strategy, outcome guarantees, immigration/firearms/licensing/custody advice, or court predictions.
- The user reports a vulnerable-person, trafficking-victim, juvenile, federal, pending-case, or high-risk offense path.

## Refund Review

Review refunds when:

- Payment succeeded but document/tracker fulfillment failed.
- Duplicate webhook/order behavior produced a duplicate paid order.
- The user paid for a session that was not `likely_eligible_for_document_prep`.
- Checkout metadata does not match a Wilma session.
- The user was charged more than 5000 cents for `wilma_document_prep`.

## Required Audit Checks

For any support/refund review, inspect:

- Wilma session ID.
- Email hash or lead/user ID.
- Decision status, document target, rule version, and reason codes.
- Checkout session ID and payment provider.
- Wilma order ID and status.
- Document-generation job ID.
- Tracker/workspace ID.
- Analytics events around checkout, payment, order, generation, tracker, and risk flags.

## User-Safe Language

Use:

"Wilma screens whether your information appears to fit LegalEase's self-help document-preparation workflow. It does not guarantee court approval or legal eligibility."

Do not say:

- "You are eligible."
- "The court will approve this."
- "This will clear your record."
- "You should file this."
