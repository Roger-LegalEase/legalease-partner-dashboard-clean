# C2_CATEGORY_B_EVIDENCE_SHARD_2

**Lane:** legal-evidence
**Worker branch:** `codex/first-wave-c2-category-b-evidence-shard-2`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.

## Your exact scope — 14 routeKeys

- `obligation:track-only:CA:ca-auto-conviction`
- `obligation:track-only:CT:ct-nonconviction-auto`
- `obligation:track-pathway:DC:dc_auto_sealing:dc_auto_sealing_16_805`
- `obligation:track-only:IN:in_auto_expungement`
- `obligation:track-only:MD:md_10104_pre_service`
- `obligation:track-only:MI:mi_arrest_acquittal_dismissal`
- `obligation:track-only:MI:mi_deferral_status`
- `obligation:track-only:MN:mn_pardon_auto_expungement`
- `obligation:track-only:NE:ne-firearm-restoration-routing`
- `obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction`
- `obligation:track-pathway:PA:pa_9122_2_clean_slate:path-j-clean-slate-automatic-limited-access`
- `obligation:track-only:VA:va_auto_seal_nonconvictions`
- `obligation:track-only:VT:vt_diversion_post_charge`
- `obligation:track-only:WV:wv_dui_test_and_lock_dismissal`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/category-b-evidence/shard-2/**`

## Prohibited paths — never write here

- `data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json`
- `docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`

## Expected outputs

- data/rcap-grade-a/category-b-evidence/shard-2/evidence.json

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active and a
mutation harness that leaves a tracked file altered will fail their runs, not
only yours.

## Stop conditions

A route whose evidence contradicts its own exclusion reason stops and is reported; it is not reclassified by this lane.

Stopping with an honest account of what is missing is a complete return. A
result reported as done on evidence nobody opened is not.

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record
keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/first-wave-c2-category-b-evidence-shard-2 bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c2-category-b-evidence-shard-2`.
