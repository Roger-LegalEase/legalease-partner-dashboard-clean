# Frozen assignment — CA-85191-runtime

Status: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.

## Exact scope

- Base commit: `c1f0741a6bf027d52cb74a26b67a811cb9194065`
- Canonical base ref: `origin/claude/rcap-final-sprint-integration`
- Frozen group key: `CA-85191-runtime:735b1636b1eb`
- Jurisdiction: `CA`
- Implementation family: `official_form_hard`
- Source dependency: `private/Nationwide Record Clearing/ (CA) + pinned registry 3b6f4c10`
- Ledger review requirement: `F-visual-and-field-fidelity`
- Exact track IDs: `CA:ca-851-91`
- Primary class(es) at base: `runtime_wiring_missing`
- Recommended owner: Terminal A
- Recommended model: Codex Sol 5.6 (xhigh)

## Required inputs

- `data/rcap-all50/hard-forms/california/cr-106-proof-of-service/profile.json`
- `data/rcap-all50/hard-forms/california/cr-181-order-for-dismissal/handoff.md`
- `data/rcap-all50/hard-forms/california/cr-409-petition-to-seal-arrest-records`
- `data/rcap-all50/hard-forms/california/cr-409-petition-to-seal-arrest-records/handoff.md`
- `data/rcap-all50/hard-forms/california/cr-409-petition-to-seal-arrest-records/profile.json`
- `data/rcap-all50/hard-forms/california/cr-409-petition-to-seal-arrest-records/source-record.json`
- `data/rcap-all50/hard-forms/california/cr-410-order-to-seal-arrest-records`
- `data/rcap-all50/hard-forms/california/cr-410-order-to-seal-arrest-records/profile.json`
- `data/rcap-all50/hard-forms/california/cr-410-order-to-seal-arrest-records/source-record.json`
- `data/rcap-all50/hard-forms/california/tier-0-reclassification-and-components.json`
- `data/rcap-all50/review-artifacts/f2-dispositions.json`
- `data/rcap-codex/remaining-tracks/legal-adoption-continuity.json`
- `data/rcap-codex/remaining-tracks/runtime-wiring-patch-specs.json`
- `data/rcap-codex/remaining-tracks/staging-test-cases.json`
- `data/rcap-ledger/e3-job-graph.json`
- `data/rcap-ledger/track-terminalization.json`
- `docs/rcap/review/f2-wave2/E-DISPOSITIONS.json`
- `docs/rcap/review/f2-wave2/E-REVIEW-REPORT.md`
- `docs/rcap/review/f2/F2-DISPOSITIONS.json`
- `docs/rcap/review/f2/F2-REVIEW-REPORT.md`
- `docs/record-clearing/deferrals/lane-b-f2-corrections.md`

Read every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.

## Owned paths

- `src/lib/rcap-engine/compiled/profiles/CA-california.json`
- `src/lib/rcap-engine/profile-registry.ts`

Do not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.

## Expected output

Wire the already-approved CR-409/CR-410 treatment into the exact compiled runtime mapping without enabling checkout or a route flag.

Preserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.

## Review requirement

Runtime technical review, legal-adoption continuity, then PREP_ONLY staging acceptance.

## Stop condition

Stop and return the exact mismatch if the base or reviewed source bytes changed, or if work would require a route flag, payment/credit behavior, staging/launch record, or another lane’s path outside declared ownership.

## Acceptance tests

- Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.
- Exact track IDs in this assignment change and no outside track changes.
- No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.
- node scripts/generate-rcap-e3-job-graph.mjs --check
- node scripts/generate-rcap-track-terminalization.mjs --check
- Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.
