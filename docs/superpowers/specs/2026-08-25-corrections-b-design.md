# Corrections B Closure Design

**Date:** 2026-08-25
**Lane:** D — `sprint/20260825-corrections-b`
**Sprint base:** `07675789a80e732d2b835c1e8ba2092b39201b79`
**Correction evidence:** `714f4d51f93461855b24c8644b6ea6ddad6d15f2`

## Goal

Close correction IDs 37–73 and reproduce the 27 candidate-exact Phase-3 `HELD_FOR_CORRECTION` flow variants assigned to lane D. Every fix must preserve route visibility, packet family, payment and sponsorship controls, and current approved legal behavior.

## Authority and boundaries

- `OWNERSHIP.md` is authoritative for the 37 deterministic proposal IDs and 27 vague flow IDs.
- The correction candidate is evidence, not an integration base. It diverges from the newer sprint base and contains captain-owned shared infrastructure.
- Existing approved route-specific timing and safety logic on the sprint base is controlling unless a newer approved legal decision from lane B expressly supersedes it.
- No waiting period, eligibility rule, packet family, form set, or purchasable state may be invented.
- A route with unproven facts remains visible and fails closed to a non-purchasable terminal.
- Lane D edits only state-local code, state-local fixtures, and focused tests for its assigned IDs. Shared evaluator, adapter, generated-ledger, package, lockfile, workflow, and migration changes are exact patches handed to lane A through `STATUS_D.md`.

## Architecture

The closure runs in two evidence-driven loops sharing one focused regression harness.

### Deterministic waiting-rule loop

For each correction ID 37–73, the harness invokes the current evaluator with an inside-wait fixture, a qualifying/outside-wait fixture where approved facts exist, and a missing-or-ambiguous-anchor fixture. It records the selected route, result code, timing conclusion, payment state, and packet family.

Each item is classified as:

1. already corrected on the sprint base and protected by a new regression assertion;
2. a state-local data or route-contract defect fixed in lane D;
3. a shared evaluator defect represented by an exact patch for lane A; or
4. an unresolved legal conflict that remains non-purchasable and is reported without inventing a rule.

The expected safety invariant is that an unproven, ineligible, inside-wait, missing-anchor, or ambiguous case never reaches checkout. A qualifying case opens only where the sprint base already contains approved, route-specific authority.

### Vague-flow reproduction loop

The 27 assigned flow IDs are reconstructed from the correction candidate’s frozen flow row and the corresponding current public fixture. Each flow is run from its real state entry through the evaluator and, after a code change, through its exact browser path once.

For every flow, `STATUS_D.md` records:

- flow ID and route key;
- fixture and entry path;
- expected and actual terminal, payment, sponsorship, and packet behavior;
- responsible question, rule, branch, form, packet, redirect, persistence, or environment contract;
- root cause and correction classification;
- focused test command and result;
- browser command and result after the fix.

Multiple flow IDs may share one root fix, but every flow retains an individual correction record and verification result.

## Data flow

1. Load the current public profile and fixture for the jurisdiction.
2. Submit canonical screening answers through the current evaluator.
3. Capture the selected pathway and terminal contract.
4. Apply the server-authoritative payment and packet gates.
5. Compare the result with the candidate-exact expected flow behavior and current approved authority.
6. Fail the focused regression test on any unsafe or incorrect divergence.
7. Apply the smallest owned fix or produce an exact captain patch.
8. Rerun only the affected evaluator case and browser path.
9. Record evidence in `STATUS_D.md` and commit a small complete batch.

## Failure handling

- Missing or ambiguous timing facts fail closed without checkout.
- A route is never hidden to make a verifier pass.
- Hosted product failures are recorded as product corrections unless evidence proves an external environment contract failure.
- A state-local fix that requires shared integration remains testable in lane D and is handed to lane A as a minimal exact patch.
- A legal conflict is reported with the conflicting authorities and keeps payment closed; it is not silently reclassified as corrected.
- Existing user-owned or other-lane changes are not modified.

## Testing

The implementation follows test-driven development for each root correction:

1. add one focused assertion that fails for the reproduced defect;
2. run it and confirm the expected failure;
3. implement the smallest correction;
4. rerun the focused test and directly related state verifier;
5. run the exact desktop or mobile browser path once after the fix;
6. run `git diff --check` for every batch.

The lane must not run full `npm test`, broad nationwide audits, or unrelated browser cases. Packet-family, form-set, checkout, entitlement, sponsorship, and route-visibility assertions are retained wherever the correction could affect them.

## Batch strategy

Work is grouped by shared root cause and state ownership, not by arbitrary item count. Each commit contains complete tests and the corresponding owned fix. Shared changes are excluded from lane-D commits and entered in `STATUS_D.md` as captain patches. The final handoff lists every correction ID, every vague flow, affected routes, commits, focused tests, browser results, and any unresolved external blocker.
