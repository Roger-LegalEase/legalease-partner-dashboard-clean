# C9_SOURCE_ACQUISITION

**Lane:** source
**Worker branch:** `codex/first-wave-c9-source-acquisition`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Acquire the 59 obligations whose exact official source is already identified, and promote the 33 held in the nationwide inventory but not in the verified corpus.

## Your exact scope — 49 obligations

- `la-976-arrest-no-conviction-set::LA-CCRP-ART-988`
- `la-976-arrest-no-conviction-set::LA-CCRP-ART-989`
- `la-976-arrest-no-conviction-set::LA-CCRP-ART-991`
- `la-976-arrest-no-conviction-set::LA-CCRP-ART-992`
- `la-977-misdemeanor-conviction-set::LA-CCRP-ART-988`
- `la-977-misdemeanor-conviction-set::LA-CCRP-ART-989`
- `la-977-misdemeanor-conviction-set::LA-CCRP-ART-991`
- `la-977-misdemeanor-conviction-set::LA-CCRP-ART-992`
- `la-977d-marijuana-first-offense-set::LA-CCRP-ART-988`
- `la-977d-marijuana-first-offense-set::LA-CCRP-ART-991`
- `la-977d-marijuana-first-offense-set::LA-CCRP-ART-992`
- `la-978-felony-conviction-set::LA-CCRP-ART-988`
- `la-978-felony-conviction-set::LA-CCRP-ART-989`
- `la-978-felony-conviction-set::LA-CCRP-ART-991`
- `la-978-felony-conviction-set::LA-CCRP-ART-992`
- `la-985-1-interim-expungement-set::LA-CCRP-ART-988`
- `la-985-1-interim-expungement-set::LA-CCRP-ART-994`
- `la-985-expungement-by-redaction-set::LA-CCRP-ART-988`
- `la-985-expungement-by-redaction-set::LA-CCRP-ART-989`
- `la-985-expungement-by-redaction-set::LA-CCRP-ART-991`
- `la-985-expungement-by-redaction-set::LA-CCRP-ART-992`
- `la-987-set-aside-and-dismiss-set::LA-CCRP-ART-987`
- `mt_mmrta_completed-set::EXPUNGEMENTREMOVALREQUESTFORM.DOCX`
- `mt_mmrta_completed-set::MT-FORM-B`
- `mt_mmrta_completed-set::MT-OCA-MMRTA`
- `mt_mmrta_serving-set::EXPUNGEMENTREMOVALREQUESTFORM.DOCX`
- `mt_mmrta_serving-set::MT-FORM-A`
- `mt_mmrta_serving-set::MT-OCA-MMRTA`
- `nd-prohibit-remote-public-access-set::ND-BRIEF-PROHIBIT-PUBLIC-ACCESS`
- `nd-prohibit-remote-public-access-set::ND-DECLARATION-OF-SERVICE`
- `nd-prohibit-remote-public-access-set::ND-MOTION-PROHIBIT-PUBLIC-ACCESS`
- `nd-prohibit-remote-public-access-set::ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS`
- `rcap-tx-custom-pleading::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_exp_acquittal-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_automatic_misdemeanor_deferred-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_conviction_no_supervision-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_deferred_other-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_dwi_conviction-set::OCA Model Order of Nondisclosure under Section 411.0736`
- `tx_nd_dwi_conviction-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_dwi_deferred-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_dwi_probation-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_probation_misdemeanor-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_veterans_court-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `tx_nd_veterans_reemployment-set::Statement of Inability to Afford Payment of Court Costs or an Appeal Bond`
- `ut_pet_remove_link-set::1110GE`
- `ut_pet_remove_link-set::1111GE`
- `ut_pet_remove_link-set::1501CR`
- `ut_pet_remove_link-set::1501CR-C`
- `ut_pet_remove_link-set::1502CR`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/source-acquisition/wave-1/**`

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

- data/rcap-grade-a/source-acquisition/wave-1/acquired.json

## Focused tests

- `node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active and a
mutation harness that leaves a tracked file altered will fail their runs, not
only yours.

## Stop conditions

BLOCKED ON EGRESS. Every Captain-reachable environment refuses court and agency hosts. This lane runs only in an environment whose egress policy permits the issuing authorities' own domains, and it acquires from the issuing authority or not at all — no mirror, cache, aggregator or lookalike form.

Stopping with an honest account of what is missing is a complete return. A
result reported as done on evidence nobody opened is not.

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record
keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/first-wave-c9-source-acquisition bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c9-source-acquisition`.
