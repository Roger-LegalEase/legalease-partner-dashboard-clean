# Internal Grade A #52 — commercial readiness

The evaluator's legal result, route and compatibility `paymentAllowed` signal
are preserved. They do not grant a purchase CTA. Authenticated Briefcase actions
now read the existing checkout prerequisite checks (including current protected
verification, exact Grade-A fulfillment, render preflight and consumer identity),
and existing payment/sponsorship and generation authority. These booleans are
presentation output, not another persisted commercial-state system. Checkout
rechecks the existing authority when requested.

Screening distinguishes legal route coverage from packet availability. VA
regime-1 remains visible and legally unchanged, with no purchasable-ready claim
or pay CTA while fulfillment fails closed. No fulfillment record, route
retirement, guidance conversion, sponsorship hold change or route promotion was
introduced. Existing protected packet access remains available.

`evidence.json` records the results and limits. Reproduce the focused proof:

```sh
node scripts/test-commercial-readiness.mjs
node scripts/test-briefcase-presentation-authority.mjs
node scripts/test-expungement-consumer-payment-receipt.mjs
node scripts/test-consumer-checkout-stored-session.mjs
# One-time refactor equivalence proof, with the pre-#52 commit available:
TASK52_COMPARE_BASELINE=95ca90ba9 node scripts/test-commercial-readiness.mjs
```

The focused tests use real fulfillment/admission/composition checks and synthetic
protected-read/provider fixtures. They exercise allowed MS checkout, missing VA
and PA fulfillment, incomplete render facts, stale verification, wrong family,
non-packet results, consumer identity, sponsorship holds, server-derived actions,
and rendered screening/pay CTA output. Inlining the shared read reproduces the
baseline checkout/order functions exactly at the AST level. The new tests are
added to commercial-flow CI without removing any existing check.

Two wider controls remain red. The unchanged checkout guard harness lacks four
required fingerprint/version fields in its synthetic verification. The Lane F
verifier fails its imported synthetic IL completeness proof; an isolated archive
of `95ca90ba9` produces the byte-identical failure after normalizing the archive
path. The archive used unchanged repository data, and was removed after the
comparison. Neither control was weakened. These failures are not passing
release evidence.

This is local engineering evidence, not hosted PostgreSQL, browser, launch or
artifact approval. #49 remains open for PostgreSQL/hosted proof. #53 awaits
Captain integration and renewed affected-artifact evidence. DC is to be rendered
once after integration with both #54 transcription and #53 composer correction.
VA regime-1's missing real fulfillment remains a Grade-A launch defect.
