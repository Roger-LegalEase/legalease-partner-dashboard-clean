# Frozen assignment — NV-sealing-source-design

Status: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.

## Exact scope

- Base commit: `c1f0741a6bf027d52cb74a26b67a811cb9194065`
- Canonical base ref: `origin/claude/rcap-final-sprint-integration`
- Frozen group key: `NV-sealing-source-design:14f9696f13d5`
- Jurisdiction: `NV`
- Implementation family: `controlled_pleading`
- Source dependency: `private/Nationwide Record Clearing/ (NV) + pinned registry 3b6f4c10`
- Ledger review requirement: `F-visual-and-field-fidelity`
- Exact track IDs: `NV:nv_seal_decrim`, `NV:nv_seal_pardon`
- Primary class(es) at base: `source_or_currentness`
- Recommended owner: Terminal C source/design owner
- Recommended model: Codex Sol 5.6 (xhigh)

## Required inputs

- `data/rcap-all50/pleadings/nevada/manifest.json`
- `data/rcap-all50/pleadings/nevada/nv_seal_decrim/handoff.md`
- `data/rcap-all50/pleadings/nevada/nv_seal_decrim/pleading-config.json`
- `data/rcap-all50/pleadings/nevada/nv_seal_pardon/handoff.md`
- `data/rcap-all50/pleadings/nevada/nv_seal_pardon/pleading-config.json`
- `data/rcap-all50/review-artifacts/f2-dispositions.json`
- `data/rcap-all50/review-artifacts/f2-independent-technical-review.json`
- `data/rcap-all50/review-artifacts/f3-visual-review.json`
- `data/rcap-codex/remaining-tracks/legal-adoption-continuity.json`
- `data/rcap-codex/remaining-tracks/research-records.json`
- `data/rcap-codex/remaining-tracks/runtime-wiring-patch-specs.json`
- `data/rcap-codex/remaining-tracks/source-citation-verification.json`
- `data/rcap-codex/remaining-tracks/source-matrix.json`
- `data/rcap-codex/remaining-tracks/source-receipts/nv-nrs-179.html`
- `data/rcap-codex/remaining-tracks/source-receipts/nv-nrs-179a.html`
- `data/rcap-codex/remaining-tracks/staging-test-cases.json`
- `data/rcap-ledger/e3-job-graph.json`
- `data/rcap-ledger/track-terminalization.json`

Read every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.

## Owned paths

- `data/rcap-all50/pleadings/nevada/nv_seal_decrim/`
- `data/rcap-all50/pleadings/nevada/nv_seal_pardon/`

Do not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.

## Expected output

Use the saved operative NRS text to resolve the form and local-rule vehicle for NRS 179.271 and 179.273, then build only the reviewed exact instruments.

Preserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.

## Review requirement

Official-source/currentness review, legal-design adoption, exact technical/visual review for the selected family, then PREP_ONLY staging.

## Stop condition

Stop before writing a canonical filing if official sources do not resolve the exact vehicle, form status, service, fee, deadline, or required element. Return the exact unresolved question; do not guess.

## Acceptance tests

- Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.
- Exact track IDs in this assignment change and no outside track changes.
- No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.
- node scripts/generate-rcap-e3-job-graph.mjs --check
- Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.
