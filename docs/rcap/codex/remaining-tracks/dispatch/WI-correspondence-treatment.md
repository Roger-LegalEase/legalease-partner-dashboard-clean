# Frozen assignment — WI-correspondence-treatment

Status: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.

## Exact scope

- Base commit: `3d8695cf8e5e9fe4464b559c97e04a526a462ade`
- Canonical base ref: `origin/claude/rcap-final-sprint-integration`
- Frozen group key: `WI-correspondence-treatment:9d1597414eaa`
- Jurisdiction: `WI`
- Implementation family: `controlled_pleading`
- Source dependency: `private/Nationwide Record Clearing/ (WI) + pinned registry 3b6f4c10`
- Ledger review requirement: `F-visual-and-field-fidelity`
- Exact track IDs: `WI:wi_exp_certificate_of_discharge_followup`
- Primary class(es) at base: `participant_treatment_missing`
- Recommended owner: Terminal B with Terminal A route owner
- Recommended model: Codex Sol 5.6 (xhigh)

## Required inputs

- `data/rcap-all50/guidance-packets/wi.json`
- `data/rcap-all50/pleadings/wisconsin/manifest.json`
- `data/rcap-all50/pleadings/wisconsin/wi_exp_certificate_of_discharge_followup/handoff.md`
- `data/rcap-all50/pleadings/wisconsin/wi_exp_certificate_of_discharge_followup/pleading-config.json`
- `data/rcap-all50/review-artifacts/f2-dispositions.json`
- `data/rcap-all50/review-artifacts/f2-independent-technical-review.json`
- `data/rcap-all50/review-artifacts/f3-visual-review.json`
- `data/rcap-codex/remaining-tracks/candidate-treatments/participant-treatments.json`
- `data/rcap-codex/remaining-tracks/legal-adoption-continuity.json`
- `data/rcap-codex/remaining-tracks/research-records.json`
- `data/rcap-codex/remaining-tracks/runtime-wiring-patch-specs.json`
- `data/rcap-codex/remaining-tracks/source-citation-verification.json`
- `data/rcap-codex/remaining-tracks/source-matrix.json`
- `data/rcap-codex/remaining-tracks/source-receipts/wi-cr-266.pdf`
- `data/rcap-codex/remaining-tracks/source-receipts/wi-statute-973-015.html`
- `data/rcap-codex/remaining-tracks/staging-test-cases.json`
- `data/rcap-ledger/e3-job-graph.json`
- `data/rcap-ledger/track-terminalization.json`

Read every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.

## Owned paths

- `data/rcap-all50/guidance-packets/wi.json`
- `src/lib/rcap-engine/compiled/profiles/WI-wisconsin.json`
- `src/lib/rcap-engine/profile-registry.ts`

Do not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.

## Expected output

Adopt and review the exact bilingual participant-correspondence treatment, preserve the current CR-266 non-probation/non-incarceration boundary, define only a counsel-reviewed case-specific non-response path, and remove the track from the pleading family.

Preserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.

## Review requirement

Official-source/currentness review, legal-design adoption, exact technical/visual review for the selected family, then PREP_ONLY staging.

## Stop condition

Stop and return the exact mismatch if the base or reviewed source bytes changed, or if work would require a route flag, payment/credit behavior, staging/launch record, or another lane’s path outside declared ownership.

## Acceptance tests

- Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.
- Exact track IDs in this assignment change and no outside track changes.
- No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.
- node scripts/generate-rcap-e3-job-graph.mjs --check
- Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.
