# STATUS C — Corrections Group A

> **Historical — a previous sprint.** This file records the `sprint/20260825-*` wave from base `07675789`. It is not a status of the current national Grade-A sprint, whose lanes are B through J on `claude/legalease-sprint-captain-utucnw` and are all integrated. Its lane letters are not this sprint's lane letters. Kept as written; nothing here is a live instruction.

- State: `HANDOFF_READY`
- Worktree: `/Users/rogerroman/LegalEase/legalease-sprint-corrections-a`
- Branch: `sprint/20260825-corrections-a`
- Assignment base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Correction authority: `714f4d51f93461855b24c8644b6ea6ddad6d15f2`
- Ownership: the first 36 lexicographically sorted `HELD` proposal IDs; the exact ordered IDs and evidence are committed in `data/expungement-ai/corrections-a/closure.json`.

## Closed classification

- 2 paid packet routes: Alaska TF-810 CourtView exclusion and Louisiana Article 998 first-offense marijuana expungement.
- 4 automatic/no-filing routes.
- 3 guidance-only routes.
- 27 legal-hold/guidance routes.
- No route outside Corrections A ownership is changed.

Only the two paid routes have exact, self-authoritative timing after the shared patch: Alaska uses an exact 60-day `disposition_date` clock; Louisiana Article 998 uses an exact 90-day `conviction_date` clock. Neither clock may fall back to `resolved_timing_bucket`.

## Actual evaluator proof

- `data/expungement-ai/corrections-a/runtime-fixtures.json` supplies public evaluator answers for all 36 assigned route IDs.
- `scripts/verify-corrections-a-runtime.mjs` proves the actual evaluator selects all 36 exact pathway IDs.
- The unintegrated base exposes seven incorrect payment openings: the three DC motion routes, Louisiana felony and misdemeanor clean-period routes, Massachusetts § 100A, and Missouri § 610.130. The exact shared ratification removal closes all seven.
- `scripts/verify-mississippi-corrections-a.mjs` proves the actual evaluator selects all three assigned Mississippi routes and keeps payment closed.
- The integrated shadow proof ran the actual evaluator for 10 Alaska/Louisiana missing/early/boundary/late/disqualifying cases and 19 Mississippi missing/early/boundary/late/branch/applicability cases. Result: green; Mississippi remains payment-closed after its exact clocks run.

## Exact shared patch for lane A

Apply:

```sh
git apply --unidiff-zero data/expungement-ai/corrections-a/shared-integration.patch
```

Patch: `data/expungement-ai/corrections-a/shared-integration.patch`

SHA-256: `d49d7e11e38d2490000dd1df9b9c3c5420af1ac22464db4cdcf09e02a629b3d5`

The patch changes exactly these shared files:

1. `src/lib/rcap-engine/evaluator.ts`
   - removes the 15 routes named by `sharedHandoff.removeFromRatifiedDeployable`;
   - adds the three Mississippi routes to `CORRECTED_AWAITING_RECONFIRM_ROUTES`;
   - adds the 14 routes named by `sharedHandoff.addToHeldGuidance`;
   - adds exact-anchor evaluation with no timing-bucket fallback;
   - anchors Alaska TF-810 to `disposition_date` and Louisiana Article 998 to `conviction_date`;
   - implements Mississippi's 2-year last-conviction clock, 5-year successful-sentence-completion clock, and both § 67-3-70(6) one-year branches.
2. `src/lib/rcap-engine/public-profile-projection.ts`
   - exposes five route-specific Mississippi date facts plus the MIP fine-applicability fact consumed by those exact clocks.
3. `data/expungement-ai/route-product-metadata.json`
   - applies the exact per-route metadata patch in `closure.json`, including payment false for every non-paid closure.

The generated patch is reproducible with `node scripts/corrections-a/build-shared-integration-patch.mjs`; `node scripts/verify-corrections-a-shared-patch.mjs` verifies byte freshness, owned route membership, and `git apply --unidiff-zero --check`.

After lane A applies the patch, run:

```sh
NODE_NO_WARNINGS=1 node scripts/verify-corrections-a-runtime.mjs --integrated
NODE_NO_WARNINGS=1 node scripts/verify-corrections-a-boundaries.mjs --integrated
node scripts/verify-corrections-a-closure.mjs --integrated
```

The disposable-shadow integrated proof is recorded in `data/expungement-ai/corrections-a/integration-proof.json` and does not modify a shared captain branch.

## Browser fixture and product-shard handoff

- Closure-matrix fixture, desktop 1440×900: 36 routes, 2 paid, 34 closed, zero horizontal overflow, zero console errors.
- Closure-matrix fixture, mobile 390×844: same route/payment counts, zero horizontal overflow, zero console errors.
- Fixture evidence: `data/expungement-ai/corrections-a/browser/result.json`, `desktop.png`, and `mobile.png`.
- This is presentation QA for the closure artifact, not a product-flow result. The evaluator-backed product shard is committed as `scripts/corrections-a/product-browser-shard.mjs` for Lane A/G to run against the integrated Next.js app.
- This lane had no `node_modules` and the volume had about 286 MB free, so starting its full Next.js app was not safe. No other lane's checkout or server was reused. Product-browser execution remains an exact external handoff blocker until the shared patch is integrated into a runnable app checkout.

## Focused verification

```sh
node scripts/verify-corrections-a-closure.mjs
NODE_NO_WARNINGS=1 node scripts/verify-corrections-a-runtime.mjs
NODE_NO_WARNINGS=1 node scripts/verify-mississippi-corrections-a.mjs
node scripts/verify-corrections-a-boundaries.mjs
node scripts/verify-corrections-a-shared-patch.mjs
```

The closure-matrix browser command and bundled runtime paths are captured by the committed fixture script. The product runner requires `CORRECTIONS_A_PRODUCT_BASE_URL` and writes separate evidence after it exercises the actual application.

## Commits

- `8cdf8394` — close Corrections A waiting-rule holds
- `e390683f` — tighten Corrections A fail-closed proof
- `e3e2713b` — add Corrections A integration gate
- Final runtime/payment/browser/handoff batch: branch tip containing this status file
