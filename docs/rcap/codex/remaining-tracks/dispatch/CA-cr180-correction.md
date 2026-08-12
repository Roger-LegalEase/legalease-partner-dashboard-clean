# Frozen assignment — CA-cr180-correction

Status: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.

## Exact scope

- Base commit: `c1f0741a6bf027d52cb74a26b67a811cb9194065`
- Canonical base ref: `origin/claude/rcap-final-sprint-integration`
- Frozen group key: `CA-cr180-correction:663c50c1680b`
- Jurisdiction: `CA`
- Implementation family: `official_form_hard`
- Source dependency: `private/Nationwide Record Clearing/ (CA) + pinned registry 3b6f4c10`
- Ledger review requirement: `F-visual-and-field-fidelity`
- Exact track IDs: `CA:ca-1203-41`, `CA:ca-1203-42`, `CA:ca-1203-43`, `CA:ca-1203-4a`, `CA:ca-17b-reduction`
- Primary class(es) at base: `correction_required`
- Recommended owner: Terminal E with Terminal A shared-verifier owner
- Recommended model: Codex Sol 5.6 (xhigh)

## Required inputs

- `data/rcap-all50/hard-forms/california/cr-106-proof-of-service/profile.json`
- `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal`
- `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/handoff.md`
- `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/profile.json`
- `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/source-record.json`
- `data/rcap-all50/hard-forms/california/cr-181-order-for-dismissal`
- `data/rcap-all50/hard-forms/california/cr-181-order-for-dismissal/handoff.md`
- `data/rcap-all50/hard-forms/california/cr-181-order-for-dismissal/profile.json`
- `data/rcap-all50/hard-forms/california/cr-181-order-for-dismissal/source-record.json`
- `data/rcap-all50/hard-forms/california/tier-0-reclassification-and-components.json`
- `data/rcap-all50/review-artifacts/f2-dispositions.json`
- `data/rcap-codex/remaining-tracks/ca-cr180-patch-spec.json`
- `data/rcap-codex/remaining-tracks/legal-adoption-continuity.json`
- `data/rcap-codex/remaining-tracks/runtime-wiring-patch-specs.json`
- `data/rcap-codex/remaining-tracks/staging-test-cases.json`
- `data/rcap-ledger/e3-job-graph.json`
- `data/rcap-ledger/track-terminalization.json`
- `docs/rcap/review/f2-wave2/E-DISPOSITIONS.json`
- `docs/rcap/review/f2/F2-DISPOSITIONS.json`
- `docs/rcap/review/f2/F2-REVIEW-REPORT.md`
- `docs/record-clearing/deferrals/lane-b-f2-corrections.md`

Read every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.

## Owned paths

- `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/`
- `data/rcap-all50/hard-forms/california/cr-106-proof-of-service/`
- `scripts/verify-rcap-hard-form-outputs.mjs`
- `scripts/rcap-hard-form-xfa-shadow-fill.mjs`

Do not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.

## Expected output

Correct the 15-day notice surface and overflow fail-closed behavior exactly as specified, then obtain fresh F2 and conditional F3 review.

Preserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.

## Review requirement

Fresh F2 review of corrected canonical bytes; refresh F3 if rendered bytes change.

## Stop condition

Stop and return the exact mismatch if the base or reviewed source bytes changed, or if work would require a route flag, payment/credit behavior, staging/launch record, or another lane’s path outside declared ownership.

## Acceptance tests

- Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.
- Exact track IDs in this assignment change and no outside track changes.
- No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.
- node scripts/generate-rcap-e3-job-graph.mjs --check
- node scripts/verify-rcap-hard-form-dispositions.mjs
- node scripts/verify-rcap-hard-form-outputs.mjs
- node scripts/verify-rcap-hard-form-rendered-assertions.mjs
- Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.
