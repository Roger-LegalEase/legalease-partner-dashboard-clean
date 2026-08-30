# C1_CATEGORY_B_EVIDENCE_SHARD_1

**Lane:** legal-evidence
**Worker branch:** `codex/first-wave-c1-category-b-evidence-shard-1`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.

## Your exact scope — 14 routeKeys

- `obligation:track-only:AK:ak-nonconviction-confidential`
- `obligation:track-only:CO:co_auto_seal_nonconviction`
- `obligation:track-pathway:DC:dc_auto_expungement:dc_auto_expungement_16_802`
- `obligation:track-pathway:IL:il-prostitution-j-auto:felony-prostitution-relief`
- `obligation:track-only:MD:md_10103_1_automatic`
- `obligation:track-only:ME:me-deferred`
- `obligation:track-only:MI:mi_auto_misd93`
- `obligation:track-only:MN:mn_mistaken_identity_iddata`
- `obligation:track-only:NC:nc_auto_146_a4`
- `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing`
- `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57`
- `obligation:track-only:VA:va_auto_seal_clean_record`
- `obligation:track-pathway:VA:va_auto_seal_convictions:automatic-sealing-no-filing`
- `obligation:track-only:WV:wv_common_nc_procedure`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/category-b-evidence/shard-1/**`

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

- data/rcap-grade-a/category-b-evidence/shard-1/evidence.json

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
git checkout -b codex/first-wave-c1-category-b-evidence-shard-1 bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c1-category-b-evidence-shard-1`.
