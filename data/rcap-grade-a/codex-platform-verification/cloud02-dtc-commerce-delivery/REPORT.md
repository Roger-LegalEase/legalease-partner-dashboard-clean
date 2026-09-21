# CLOUD02 — DTC commerce and private-delivery independent verification

## Scope and checkout identity

- Assignment: `CLOUD02_DTC_COMMERCE_DELIVERY`
- Current checkout branch: `work` (the requested selected branch was `claude/legalease-sprint-captain-utucnw`; no branch switch or Git network operation was performed).
- Current head: `48f74d82016795307e565220e38ce369cf43da5e`
- Required ancestor: `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13`
- Ancestor check: **PASS** (`git merge-base --is-ancestor ... HEAD` exited 0).
- Production touched: **NO**.
- Application, migration, packet, authority, queue, and configuration files modified: **0**.

## Verdict

**INCONCLUSIVE / FAIL CLOSED.** Current-head source-level and mutation checks reproduced important guards, but the environment has no PostgreSQL 16 toolchain. The database-backed acceptance paths that decide verified-event authority, idempotent entitlement, durable job binding, artifact ownership, repeat delivery, retry convergence, stale-answer invalidation, and sponsored/consumer separation therefore did not execute. A skipped database verifier is not counted as a pass.

No current-head payment, entitlement, delivery, double-charge, or cross-matter bypass was reproduced. This is not affirmative proof that no bypass exists; the decisive database cases were unavailable.

## Case accounting

The focused suite ran 20 commands:

- PASS: 7
- FAIL: 10
- SKIP: 3 (commands exited 0 but explicitly printed `SKIPPED`; counted separately)
- Total: 20

The verbatim command output and exit status for every case is in `focused-suite.log`.

### Passing cases

1. `node scripts/verify-rcap-phase55-matter-payment-binding.mjs`
2. `node scripts/verify-expungement-dtc-stripe-gate.mjs`
3. `node scripts/test-rcap-consumer-payment-http-mutations.mjs`
4. `node scripts/verify-rcap-money-gate-delivery-binding.mjs`
5. `node scripts/verify-rcap-money-gate-delivery-binding.mjs --mutations`
6. `node scripts/verify-expungement-dtc-auth-payment-briefcase-flow.mjs`
7. `node scripts/verify-expungement-dtc-flow-unchanged.mjs`

### Explicit skips

1. `node scripts/verify-rcap-phase52-consumer-payment-authority.mjs`
2. `node scripts/verify-rcap-phase53-consumer-job-binding.mjs`
3. `node scripts/verify-rcap-consumer-lifecycle-boundaries.mjs`

### Failing cases

1. `node scripts/verify-expungement-consumer-checkout.mjs`
2. `node scripts/test-expungement-checkout-guards.mjs`
3. `node scripts/verify-rcap-phase51-consumer-payment-security.mjs`
4. `node scripts/test-rcap-phase52-mutations.mjs`
5. `node scripts/test-rcap-phase53-mutations.mjs`
6. `node scripts/verify-expungement-consumer-payment-http.mjs`
7. `node scripts/verify-rcap-packet-delivery-db.mjs`
8. `node scripts/verify-rcap-render-worker-delivery.mjs`
9. `node scripts/verify-rcap-packet-delivery-e2e.mjs`
10. `node scripts/verify-expungement-post-payment-packet-generation.mjs`

## Reproduced positive evidence (not a substitute for the skipped database cases)

- Phase 55's synthetic database harness reports exact user/item/product/person/matter/Session/5000/USD binding and safe duplicate, retry, correction, second-matter, and refund-after-delivery convergence.
- The DTC Stripe boundary verifier reports one matter-bound $50 Checkout after protected facts and final verification; sponsored matters remain outside consumer Checkout.
- The HTTP mutation suite killed 8/8 mutations, including removed amount, currency, and current-verification checks; weakened server authority; default-enabled delivery; overbroad staging scope; missing recorded-payment enqueue; and client-selected matter.
- The money/delivery binding verifier executed 755 assertions over 51 jurisdictions and reported no route that can take money for a packet it cannot produce.
- Auth/Briefcase flow negative controls detected pre-verification Checkout and loss of exact-matter routing.
- Current source creates Stripe sessions at `5000` cents in `usd`, binds one line item to the consumer product, uses a verification- and revision-scoped idempotency key, and validates reusable sessions against user, Briefcase item, pathway, verification hash, amount, currency, quantity, and product name.
- Current webhook reconciliation compares canonical product/person/matter and current verification hash before recording payment; it records through the server-only payment writer, enqueues the durable render, and leaves packet state pending rather than ready.

## Defects and bounded remediation

### CLOUD02-V01 — Required database acceptance path cannot execute

- **Exact reproduction:** Run `node scripts/verify-rcap-phase51-consumer-payment-security.mjs`, `node scripts/verify-expungement-consumer-payment-http.mjs`, `node scripts/verify-rcap-packet-delivery-db.mjs`, `node scripts/verify-rcap-render-worker-delivery.mjs`, or `node scripts/verify-rcap-packet-delivery-e2e.mjs` at head `48f74d8`. Each refuses because PostgreSQL 16/local PostgreSQL is unavailable.
- **Expected:** Each verifier starts its ephemeral database and exercises the SQL/RPC boundary, including adversarial wrong-user/matter/product/session/replay and private-delivery cases.
- **Actual:** No `postgres`, `initdb`, or `psql` executable is present, and each command exits 1 before the acceptance cases run.
- **Affected path/symbol:** Environment/toolchain consumed by the five scripts above; no application symbol is implicated by this finding.
- **Security or user impact:** CLOUD02 cannot independently prove the authority and ownership boundaries that reside in SQL. Treat payment and delivery promotion evidence as incomplete, not passing.
- **Smallest bounded patch:** In the verification environment image only, provide the PostgreSQL 16 server/client executables expected by the existing harness. Do not change application or migration logic to accommodate a missing verifier dependency.
- **Focused regression test:** Re-run the five exact commands and require non-skip exit 0 with their database assertions executed.

### CLOUD02-V02 — Phase 52/53 mutation runners accept skipped baselines

- **Exact reproduction:** Run `node scripts/test-rcap-phase52-mutations.mjs` and `node scripts/test-rcap-phase53-mutations.mjs` without PostgreSQL. Phase 52 reports 12 survived security mutations; Phase 53 reports 8 survived mutations. Their underlying verifiers print `SKIPPED` and exit 0.
- **Expected:** A mutation runner must fail its baseline as unavailable when the verifier skipped, or run every mutant against a real database and kill it.
- **Actual:** The skip exit code is interpreted as a green verifier result, so deliberately weakened grants, constraints, uniqueness, amount/currency enforcement, ownership, job binding, and sponsorship checks are reported as survivors rather than as an unavailable baseline.
- **Affected path/symbol:** `scripts/test-rcap-phase52-mutations.mjs`, `scripts/test-rcap-phase53-mutations.mjs`, and the skip behavior in `scripts/verify-rcap-phase52-consumer-payment-authority.mjs` / `scripts/verify-rcap-phase53-consumer-job-binding.mjs`.
- **Security or user impact:** CI can produce ambiguous mutation evidence; a missing database can look green at the baseline and masks whether critical payment/entitlement mutations are actually detected.
- **Smallest bounded patch:** Make the DB verifiers use a distinct nonzero “unavailable” exit or machine-readable status, and make both mutation runners abort before mutation when the baseline is skipped.
- **Focused regression test:** Execute each mutation runner with PostgreSQL deliberately absent and assert it exits nonzero with `baseline unavailable` and zero mutants attempted; then execute with PostgreSQL 16 and require all 20 listed mutants killed.

### CLOUD02-V03 — Checkout guard behavioral test cannot resolve repository aliases

- **Exact reproduction:** Run `node scripts/test-expungement-checkout-guards.mjs` at current head.
- **Expected:** The synthetic fixtures load `payment-adapter.ts` and execute active-session reuse, wrong binding, and checkout guard behaviors.
- **Actual:** Node throws `MODULE_NOT_FOUND: @/lib/expungement-ai/packet-fulfillment-authority` from the generated `payment-adapter.ts.cjs` before a case executes.
- **Affected path/symbol:** `scripts/test-expungement-checkout-guards.mjs`, specifically its TypeScript-to-CJS loader/mock resolver.
- **Security or user impact:** The main executable checkout-guard suite supplies no behavioral evidence at this head; static source checks alone cannot replace it.
- **Smallest bounded patch:** Extend only the test loader's alias map/mock table to resolve `@/lib/expungement-ai/packet-fulfillment-authority` (and fail explicitly on any future unresolved alias) without changing production imports.
- **Focused regression test:** Run `node scripts/test-expungement-checkout-guards.mjs` and require the full fixture case count plus exit 0; add a self-test that unresolved `@/` imports fail with the exact missing alias.

### CLOUD02-V04 — Consumer-checkout static verifier is stale against current safe symbols

- **Exact reproduction:** Run `node scripts/verify-expungement-consumer-checkout.mjs`.
- **Expected:** The verifier recognizes the current webhook's pending-after-enqueue behavior and current route identity metadata, then proceeds to its dependent checks.
- **Actual:** It reports that payment confirmation marks packets ready and that `pathway_label` is absent. Current source instead sets `pending` only after a durable queue succeeds, and binds `pathway_id` plus verification hash. The verifier looks for the obsolete exact string `item.packetStatus === "ready" ? "ready" : "pending"` and an obsolete metadata label.
- **Affected path/symbol:** Assertions in `scripts/verify-expungement-consumer-checkout.mjs`; current symbols `finalizePaidCheckoutSession` and `checkoutMetadata` are the mismatched targets.
- **Security or user impact:** False failures obscure the stronger current invariant and encourage string-shape fixes rather than behavioral verification. No payment bypass was reproduced by this mismatch.
- **Smallest bounded patch:** Replace those two string assertions with fixture-driven assertions: webhook success must enqueue once and persist `pending`, never `ready`; metadata must carry canonical `pathway_id` and verification hash, while display labels remain non-authoritative.
- **Focused regression test:** Add negative controls that change the persisted status to `ready`, omit `pathway_id`, or substitute a display label for canonical pathway identity; require all three mutations to turn the verifier red.

### CLOUD02-V05 — Post-payment verifier has drifted from protected artifact/presentation architecture

- **Exact reproduction:** Run `node scripts/verify-expungement-post-payment-packet-generation.mjs`.
- **Expected:** Behavioral checks validate current protected payment authority, protected artifact authority, owner-scoped presentation, retry, and receipt surfaces.
- **Actual:** The verifier emits six direct string-shape failures (paid/dry-run syntax, guidance fallback syntax, artifact rendering syntax, retry syntax, card metadata syntax, and receipt syntax), even though the current code routes these concepts through newer protected authority/presentation types. Its dependent launch checks also fail because neither `origin/main` nor local `main` exists.
- **Affected path/symbol:** `scripts/verify-expungement-post-payment-packet-generation.mjs` assertions over `packet-generation.ts`, `src/app/briefcase/[packetId]/page.tsx`, and `BriefcaseViews.tsx`; dependent default-branch lookup.
- **Security or user impact:** No reliable pass/fail statement can be made about repeat private download or retry UI from this verifier. A recommendation based only on its string mismatches would not be a reproduced application finding.
- **Smallest bounded patch:** Update the verifier only: drive the public packet status/download/retry surfaces with synthetic owner/non-owner/paid/unpaid/failed/ready fixtures, and make unrelated default-branch comparison an explicit prerequisite rather than mixing it into commerce assertions.
- **Focused regression test:** Add behavioral mutations for artifact absent-but-status-ready, non-owner download, paid failed job with no retry, missing receipt presentation, and guidance generation; require each mutation to fail independently.

## Mission matrix

| Requirement | Result | Evidence boundary |
|---|---|---|
| Exact-matter 5000-cent USD checkout | Partial pass | Phase 55 and DTC Stripe verifier passed; checkout behavioral guard suite did not load. |
| Active-session reuse | Partial pass | Current source validates reusable session binding; behavioral suite failed before fixtures. |
| Verified event authority | Inconclusive | HTTP mutations passed; DB authority verifier unavailable. |
| Webhook idempotency | Partial pass | Current source and Phase 55 synthetic harness support convergence; database replay not run. |
| Wrong amount/currency/user/matter/product/session/replay denial | Partial pass | HTTP mutations and Phase 55 passed; DB acceptance unavailable. |
| Payment history separated from generation authority | Partial pass | Current webhook records payment then separately enqueues; end-to-end DB unavailable. |
| Exact-matter entitlement | Inconclusive | Phase 55 passed; Phase 52 DB verifier skipped. |
| Durable job authorization | Inconclusive | Phase 55 passed; Phase 53 DB verifier skipped. |
| Private artifact ownership | Inconclusive | Delivery DB/E2E verifiers could not start. |
| Repeat download without recharge | Inconclusive | Delivery E2E could not start. |
| Retry/failure without duplicate payment | Partial pass | Phase 55 synthetic convergence passed; worker DB/E2E unavailable. |
| Material answer edit invalidates stale authority | Partial pass | HTTP mutation caught removed current-verification check; DB lifecycle skipped. |
| Sponsored path never invokes consumer payment authority | Partial pass | DTC boundary and flow checks passed; DB lifecycle skipped. |

## Required return

```text
ASSIGNMENT: CLOUD02_DTC_COMMERCE_DELIVERY
BASE SHA: 4fb89c96e2886e6d9d80f9bb757278c20ecb6b13
COMMIT: recorded after committing this report
CASES RUN: 20 (7 pass, 10 fail, 3 explicit skip)
PASS: 7
FAIL: 10
PAYMENT BYPASS FOUND: NO REPRODUCED BYPASS; DATABASE PROOF INCONCLUSIVE
ENTITLEMENT BYPASS FOUND: NO REPRODUCED BYPASS; DATABASE PROOF INCONCLUSIVE
DELIVERY BYPASS FOUND: NO REPRODUCED BYPASS; DATABASE PROOF INCONCLUSIVE
DOUBLE-CHARGE DEFECT: NO REPRODUCED DEFECT; END-TO-END PROOF INCONCLUSIVE
CROSS-MATTER DEFECT: NO REPRODUCED DEFECT; DATABASE PROOF INCONCLUSIVE
DEFECTS: CLOUD02-V01, CLOUD02-V02, CLOUD02-V03, CLOUD02-V04, CLOUD02-V05
APPLICATION FILES MODIFIED: 0
PRODUCTION TOUCHED: NO
```
