# C3_CATEGORY_B_EVIDENCE_SHARD_3

**Lane:** legal-evidence
**Worker branch:** `codex/first-wave-c3-category-b-evidence-shard-3`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.

## Your exact scope — 14 routeKeys

- `obligation:track-pathway:CA:ca-auto-arrest:tool-2-automatic-relief`
- `obligation:track-pathway:CT:ct-cleanslate-auto:automatic-clean-slate-erasure-for-eligible-post-2000-convictions`
- `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a`
- `obligation:track-only:KY:ky_automatic_nonconviction_expungement_verification`
- `obligation:track-only:MD:md_10112_dpscs_cannabis`
- `obligation:track-only:MI:mi_arrest_no_charge`
- `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g`
- `obligation:track-pathway:MO:mo-610-141-automatic-drug:state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141`
- `obligation:track-only:NE:ne-out-of-jurisdiction-routing`
- `obligation:track-only:NJ:nj_automated_clean_slate`
- `obligation:track-pathway:UT:ut_auto_nonconviction:path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice`
- `obligation:track-only:VA:va_auto_seal_without_order`
- `obligation:track-only:VT:vt_diversion_pre_charge`
- `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/category-b-evidence/shard-3/**`

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

- data/rcap-grade-a/category-b-evidence/shard-3/evidence.json

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
git checkout -b codex/first-wave-c3-category-b-evidence-shard-3 bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c3-category-b-evidence-shard-3`.
