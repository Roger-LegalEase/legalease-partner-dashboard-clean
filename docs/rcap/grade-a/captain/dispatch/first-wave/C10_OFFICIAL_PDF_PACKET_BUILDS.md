# C10_OFFICIAL_PDF_PACKET_BUILDS

**Lane:** packet
**Worker branch:** `codex/first-wave-c10-official-pdf-packet-builds`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Build official-PDF packet families whose source is already held. 43 families qualify; take them in the listed order.

## Your exact scope — 43 worklistGroupIds

- `az_marijuana_expungement_arrest_no_charges-set`
- `az_marijuana_expungement_superior_court-set`
- `ca-1203-41-set`
- `ca-1203-42-set`
- `ca-1203-43-set`
- `ca-1203-4a-set`
- `ca-17b-reduction-set`
- `ca-851-91-set`
- `ca-prop64-set`
- `ne-setaside-custodial-set`
- `ne-trafficking-setaside-and-seal-set`
- `nj_arrest_no_conviction-set`
- `nj_clean_slate-set`
- `nj_disorderly_persons-set`
- `nj_indictable_conviction-set`
- `nj_ordinance-set`
- `ny_160_59_petition-set`
- `ny_mrta_marijuana-set`
- `pa_490_nonconviction-set`
- `pa_790_nonconviction-set`
- `pa_9122_1_limited_access-set`
- `pa_summary_conviction-set`
- `ri_nonconviction_sealing-set`
- `sd_arrest_expungement-set`
- `ut_pet_acquittal-set`
- `ut_pet_conviction-set`
- `ut_pet_dismissed_with_prejudice-set`
- `ut_pet_dismissed_without_prejudice-set`
- `ut_pet_limitations-set`
- `ut_pet_no_charges-set`
- `ut_pet_traffic-set`
- `wa_blake_vacatur_and_lfo_refund-set`
- `wa_vac_cannabis-set`
- `wa_vac_domestic_violence-set`
- `wa_vac_felony-set`
- `wa_vac_homicide_victim_prostitution-set`
- `wa_vac_misdemeanor_ordinary-set`
- `wa_vac_substance_use_disorder-set`
- `wa_vac_survivor_felony-set`
- `wa_vac_survivor_misdemeanor-set`
- `wa_vac_treaty_fishing-set`
- `wv_conv_multiple_misdemeanors-set`
- `wv_conv_single_misdemeanor-set`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/**  (only the families listed below)`
- `scripts/build-census-v1-<family>.mjs`

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

- one field census, field map, canonical and boundary fixtures, actual-write report and page rasters per family

## Focused tests

- `node scripts/verify-packet-build-environment.mjs --family <family>`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active and a
mutation harness that leaves a tracked file altered will fail their runs, not
only yours.

## Stop conditions

The packet-build environment preflight must print PACKET_BUILD_ENVIRONMENT_READY 14/14 before anything is written. A family whose source does not bind by exact SHA-256 stops.

Stopping with an honest account of what is missing is a complete return. A
result reported as done on evidence nobody opened is not.

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record
keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/first-wave-c10-official-pdf-packet-builds bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c10-official-pdf-packet-builds`.
