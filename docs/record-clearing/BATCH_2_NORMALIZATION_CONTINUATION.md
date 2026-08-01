# Batch 2 normalization — continuation state

Last updated: 1 August 2026
Branch: `feat/record-clearing-batch-2-legal-design`
Base: `e3f034b9c499fc6b6ec906dd82ef8e6599f8951f` (PR #87 platform base)
Last clean checkpoint: `2d787e7` — Batch 2 source-package import

## Done

- **B1** worktree `/workspaces/legalease-partner-dashboard-clean-batch-2`,
  branch cut from the exact base and pushed. Private corpus synced, untracked
  (`git ls-files private/` → 0).
- **B2** inputs verified: bundle 7/7 OK, source package 46/46 OK.
- **B3** source-package import complete. 39 files, 0 conflicts. Registries
  regenerated from the single canonical inventory. See
  `BATCH_2_SOURCE_IMPORT_RECORD.md` and `batch-2-source-gap-report.json`.

## Not started

**B4–B9 legal-design normalization of all fourteen jurisdictions.**

`GA IL IN IA KS LA ME MD MA MI MN MS MO MT` — **0 of 14 normalized.**

Planned bounded groups, in the spec's order:

| # | Group | Status |
|---|---|---|
| 1 | Illinois, Iowa | not started |
| 2 | Maryland, Massachusetts | not started |
| 3 | Indiana, Missouri | not started |
| 4 | Louisiana, Minnesota | not started |
| 5 | Montana, Georgia | not started |
| 6 | Maine, Michigan | not started |
| 7 | Mississippi, Kansas | not started |

Per group: exact source-slot reconciliation → report-only intake → strict
intake → Batch 2 delta → composed-unit approvals guard → focused verifier →
clean commit and push.

## Inputs, already staged and verified

`/workspaces/legalease-legal-review-import/batch-2/`

- `LegalEase_Batch_2_Legal_Research_Resolution_Memo_ADOPTED.md` — controlling
  where it expressly changes track structure, output strategy, packet
  capability, blocker treatment, product scope, geography, or supporting-document
  treatment. Otherwise the original jurisdiction review controls.
- `LEGALEASE_BATCH_2_COMBINED_SOURCE.md` — original jurisdiction reviews.
- `LEGALEASE_BATCH_2_STATE_SUMMARY.csv`
- `extracted/review-clean/` — 14 per-jurisdiction review files.
- `extracted/missing-forms-v3/` — the imported source package.

## Carry-forward rules for the next session

- 136 source slots; ~140 normalized nodes and ~135 substantive relief mechanisms
  expected. **Generate actual counts from the corpus — these are expectations,
  not constants.**
- Georgia correction is controlling: `GA-FO-SENTENCING-POST2026`,
  `GA-FO-ACTIVE-PRE2026`, `GA-FO-DISCHARGED-PRE2026`; `GA-RFO` separate and
  unchanged. L-2 and L-3 are notice-based, no prosecutor consent, not
  opposition/hearing branches. `GA-RFO` under § 42-8-66 requires advance
  prosecuting-attorney consent. **No old-M-to-new-L mapping.**
- Renderer strategies are only `custom_pleading`, `official_pdf_fill`,
  `process_guidance`. Sequential/alternative/mixed are composition modes.
- Import when mechanism and packet identity are known, even with a missing form,
  unverified revision, open fee/service rule or pending output approval — keep
  those as source/build/release gates and the route runtime-disabled.
- Defer under `legal_research_required` only for the six listed unresolved
  questions. A deferred item gets no invented strategy.
- Do not infer legal substance. Preserve exact source statements and raise one
  precise counsel question.
- Georgia and Mississippi received zero source files; absent forms are **open
  source questions**, not "not required".

## Invariants that must still hold at every checkpoint

Batch 1 unchanged · every imported Batch 2 route `runtime_disabled` · every
deferred route unregistered and unreachable · zero Batch 2 tracks
`packet_ready` · zero jurisdictions enabled · launch gate red · PR #87 and #89
unmerged · #89 draft · Phase 48 unapplied · nothing deployed · no Batch 1
promotion branch · no Batch 2 PR to main before #87 merges with a merge commit.

## Out of scope for this branch

The platform storage-unification correction (R1 decision, blocked by R7) belongs
on the PR #87 platform-core lane. **Do not edit platform storage code here.**
