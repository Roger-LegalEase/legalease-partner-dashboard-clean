# Wilma State QA

Wilma is a self-help document-preparation screener. It does not provide legal advice, legal strategy, guarantees, or court predictions.

## Manual QA Matrix

| Scenario | Expected result |
| --- | --- |
| IL dismissed state case | `likely_eligible_for_document_prep` -> email gate -> checkout |
| PA nonconviction | `likely_eligible_for_document_prep` -> email gate -> checkout |
| MD dismissal/not guilty | `likely_eligible_for_document_prep` -> email gate -> checkout |
| DC nonconviction sealing by motion | likely eligible only if required facts are present |
| MS dismissed/dropped/not guilty | `likely_eligible_for_document_prep` -> email gate -> checkout |
| TX Chapter 55A acquittal | `likely_eligible_for_document_prep` -> email gate -> checkout |
| TX nondisclosure | no paid CTA |
| Federal case | `not_a_fit_for_this_service` |
| Unsupported state | `outside_supported_scope` |
| Pending case | no paid CTA |
| No email captured | no checkout |
| Fake browser payment-success POST | no order, no docs, no tracker |
| Duplicate webhook replay | one order and one document/tracker handoff |
| 40-message cap | safe stop message |
| Expired session | safe restart message |

## Supported Paid Paths To Smoke

- Illinois: clean nonconvictions; vacated/reversed convictions.
- Pennsylvania: clean nonconvictions; full acquittals; summary expungement; misdemeanor limited access.
- Maryland: favorable dispositions; early favorable-disposition waiver path.
- DC: nonconviction sealing by motion only.
- Mississippi: nonconvictions; first-offender non-traffic misdemeanors.
- Texas: Chapter 55A expunction paths only.

## Disabled / Known Limitation Paths

- Illinois conviction sealing.
- Pennsylvania felony limited access.
- Maryland guilty-disposition expungement.
- DC conviction sealing and actual innocence.
- Mississippi felony expunction and trafficking-victim relief.
- Texas nondisclosure.

## Smoke Prompts

Use these as starting scripts and confirm the UI/API result, email gate behavior, and paid CTA visibility.

- IL: "My Illinois state case in Cook County was dismissed. It was an adult case and nothing is pending."
- PA: "My Pennsylvania charges were withdrawn and I have the county docket."
- MD: "My Maryland case was dismissed more than three years ago and all charges were resolved."
- DC: "My DC case ended without a conviction and I have facts about housing and work reasons for sealing."
- MS: "My Mississippi charge was dismissed and there is no pending case."
- TX: "I was acquitted in a Texas trial court and there is no same criminal episode conviction or pending case."
- TX nondisclosure: "I finished deferred adjudication and want a nondisclosure order."
- Unsupported: "My record is in New York."
- Federal: "This was a federal case."
- Pending: "I still have a pending criminal case."

## Webhook And Abuse Smoke Tests

- Fake browser payment-success POST: submit a client/browser request without a valid provider signature and confirm no order, documents, tracker, or payment analytics events are created.
- Duplicate webhook replay: replay the same verified provider payment event and confirm one order, one document-generation handoff, and one tracker/workspace handoff.
- Wrong amount/product metadata: confirm payment success is rejected and no order is created.
- Message cap: send more than 40 free-screening messages and confirm the safe stop copy appears.
- Expired session: resume a session after the configured inactivity window and confirm the safe restart copy appears.
- Paid access after abuse controls: confirm chat limits do not block access to paid order status, petition packet, resources, or tracker/workspace.
