# Frozen assignment — WV-deferral-recognition

Status: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.

## Exact scope

- Base commit: `c1f0741a6bf027d52cb74a26b67a811cb9194065`
- Canonical base ref: `origin/claude/rcap-final-sprint-integration`
- Frozen group key: `WV-deferral-recognition:a1d00981c755`
- Jurisdiction: `WV`
- Implementation family: `official_form_hard`
- Source dependency: `private/Nationwide Record Clearing/ (WV) + pinned registry 3b6f4c10`
- Ledger review requirement: `F-deferral-statement-exactness`
- Exact track IDs: `WV:wv_conv_multiple_misdemeanors`, `WV:wv_conv_nonviolent_felony`, `WV:wv_conv_single_misdemeanor`
- Primary class(es) at base: `already_resolved_but_ledger_stale`
- Recommended owner: Terminal A with Terminal B
- Recommended model: Codex Sol 5.6 (xhigh)

## Required inputs

- `data/rcap-all50/guidance-packets/wv.json`
- `data/rcap-all50/review-artifacts/f2-dispositions.json`
- `data/rcap-all50/review-artifacts/f2-independent-technical-review.json`
- `data/rcap-codex/remaining-tracks/candidate-recognition-patch-spec.json`
- `data/rcap-codex/remaining-tracks/legal-adoption-continuity.json`
- `data/rcap-codex/remaining-tracks/staging-test-cases.json`
- `data/rcap-ledger/track-terminalization.json`
- `docs/rcap/review/f2-wave2/B-DISPOSITIONS.json`
- `docs/rcap/review/f2-wave2/B-REVIEW-REPORT.md`
- `docs/record-clearing/deferrals/lane-b-source-evidence-gaps.md`
- `docs/record-clearing/deferrals/wv-deferrals.md`

Read every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.

## Owned paths

- `scripts/generate-rcap-track-terminalization.mjs`
- `data/rcap-all50/deferrals/recognized-deferrals.json`

Do not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.

## Expected output

Add validated machine-readable recognition of the three approved West Virginia exact-supported deferrals.

Preserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.

## Review requirement

Shared-generator review plus proof that a current exact F2 technical_approved closure remains the only promotion signal.

## Stop condition

Stop if recognition cannot be tied to existing exact deferral evidence and a current technical_approved closure, or if any unrelated track byte or disposition changes.

## Acceptance tests

- Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.
- Exact track IDs in this assignment change and no outside track changes.
- No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.
- node scripts/generate-rcap-track-terminalization.mjs --check
- Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.
