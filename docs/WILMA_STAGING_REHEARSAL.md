# Wilma Staging Rehearsal

Wilma determines whether a user appears to fit LegalEase's self-help document-preparation workflow. Wilma does not provide legal advice, legal strategy, court predictions, or any guarantee of expungement, sealing, nondisclosure, court approval, or legal eligibility.

Run this rehearsal in staging before public launch and before any production rollout expansion. Use test payment credentials, staging OpenAI configuration, staging admin access, and staging document/tracker backends.

## Required Commands

- `npm run wilma:readiness` in the staging environment.
- `npm run wilma:smoke` to review the expected manual QA matrix.
- `npm run wilma:rehearsal` to print this staging-specific rehearsal checklist.
- `npm run typecheck`, `npm test`, and `npm run lint` in CI or a clean clone.

## Setup

- Confirm staging points to the staging LegalEase host.
- Confirm `OPENAI_API_KEY`, payment secrets, webhook secret, rate-limit backend, bot-protection secret, monitoring DSN, and alert webhook are configured server-side only.
- Confirm `/api/wilma/payment-success` receives provider-verified test webhooks and rejects browser/client posts.
- Confirm admin reviewer has access to `/admin/wilma` and `/admin/wilma/[sessionId]`.
- Confirm no production customer data is used during rehearsal.

## Rehearsal Steps

1. Open the staging LegalEase page and confirm the Wilma widget loads.
2. Confirm the supported state selector shows IL, PA, MD, DC, MS, and TX.
3. Run an unsupported state path and confirm it returns `outside_supported_scope` with no paid CTA.
4. Run a clean eligible path, such as an Illinois dismissed adult state case, and confirm Wilma reaches the email gate.
5. Submit a valid staging email and confirm lead creation or update is visible in the backend/admin data.
6. Confirm the paid CTA is hidden before email capture and appears only after email capture.
7. Click the paid CTA and confirm checkout opens with the $50 `wilma_document_prep` product.
8. POST to `/api/wilma/payment-success` from a browser/client-style request without a valid provider signature and confirm it is rejected.
9. Send a verified test payment webhook and confirm exactly one Wilma order is created.
10. Replay the same verified webhook and confirm it does not create duplicate orders, documents, or tracker/workspaces.
11. Confirm document generation receives structured Wilma facts, not raw freeform transcript text as the primary payload.
12. Confirm tracker/workspace handoff is created and linked to the order.
13. Open `/admin/wilma` and confirm the session appears in the admin list.
14. Open `/admin/wilma/[sessionId]` and confirm transcript, facts, decision, risk flags, analytics events, checkout/payment/order status, and document/tracker fulfillment status are visible.
15. Exercise abuse controls for message cap, session expiration, and rate-limit paths. Confirm safe fallback copy and Wilma risk/event logging.
16. Run `npm run wilma:readiness` in staging and resolve any failures or explicitly document any launch-owner-approved warnings.

## Six-State QA

Use `docs/WILMA_STATE_QA.md` as the source of truth for the state matrix. At minimum, verify:

- IL clean dismissed case: likely eligible -> email gate -> checkout.
- PA nonconviction case: likely eligible -> email gate -> checkout.
- MD favorable disposition: likely eligible -> email gate -> checkout.
- DC nonconviction sealing by motion: likely eligible only when required facts are present.
- MS nonconviction expunction: likely eligible -> email gate -> checkout.
- TX Chapter 55A acquittal: likely eligible -> email gate -> checkout.
- TX nondisclosure disabled path: no paid CTA.
- Unsupported state: outside supported scope.
- Federal case: not a fit.
- Pending case: no paid CTA.

## Evidence To Capture

- Staging URL and commit/branch under test.
- Time the rehearsal started and ended.
- Test Wilma session IDs.
- Test checkout session ID.
- Test payment event ID.
- Wilma order ID.
- Document-generation job ID.
- Tracker/workspace ID.
- Screenshots or admin notes for the admin list and detail pages.
- Any readiness warnings and their launch-owner decision.

## Pass Criteria

- Every rehearsal step above passes.
- Readiness script passes in staging, or every warning has an explicit launch-owner disposition.
- Fake/browser payment-success POST creates no order, no documents, no tracker, and no payment-success/order/fulfillment analytics events.
- Duplicate webhook replay creates one order and one document/tracker handoff total.
- Admin access control blocks anonymous and non-admin users.
- Abuse controls do not block verified paid fulfillment or paid workspace/order access.

## Stop Conditions

Do not launch if any of these are true:

- Payment-success can be spoofed from the browser.
- Duplicate webhooks create duplicate orders, documents, or trackers.
- Checkout can be created before likely-eligible decision and email capture.
- Admin transcript pages are visible to anonymous or non-admin users.
- Client code imports server-only env or references OpenAI/payment secrets.
- Staging readiness has unresolved critical failures.
