# C8_SOURCE_IDENTITY

**Lane:** source
**Worker branch:** `codex/first-wave-c8-source-identity`
**Branch from:** `bc504a3e1b160e153a7393ed8673f3e784c0a8c7` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Resolve the 19 document obligations whose identity is still unresolved and the 11 whose official URL is unknown. Name the document; do not guess a form number.

## Your exact scope — 30 obligations

- `ar-act346-set::The ACIC petition counterpart to the Act 346 order to dismiss and seal.`
- `ar-misdemeanor-seal-set::The ACIC petition for the misdemeanour branch, A.C.A. 16-90-1405.`
- `ar-veterans-court-set::The ACIC order counterpart for the veterans treatment court route.`
- `de_mandatory_expungement-set::The application for mandatory expungement to the State Bureau of Identification under 11 Del. C. 4373.`
- `fl-administrative-set::The FDLE application for administrative expunction under section 943.0581, Fla. Stat.`
- `ia-12346-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-12347-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-7251-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-901c2-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-901c3-set::The Iowa expungement application prescribed as Iowa R. Crim. P. 2.86 Form 2.`
- `ia-901c3-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `in_arrest_no_charges-set::CCA-GF-0120-3016`
- `in_arrest_no_charges-set::CCA-XP-0120-7002 Form ACR`
- `in_arrest_no_charges-set::Confidential Information Form`
- `in_conviction_d6-set::CCA-GF-0120-3016`
- `in_conviction_d6-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_d6-set::Confidential Information Form`
- `in_conviction_felony-set::CCA-GF-0120-3016`
- `in_conviction_felony-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_felony-set::Confidential Information Form`
- `in_conviction_misd-set::CCA-GF-0120-3016`
- `in_conviction_misd-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_misd-set::Confidential Information Form`
- `in_section1_petition-set::CCA-GF-0120-3016`
- `in_section1_petition-set::CCA-XP-0120-7002 Form ACR`
- `in_section1_petition-set::Confidential Information Form`
- `mi_setaside_trafficking-set::Proof of Service`
- `rcap-in-custom-pleading::CCA-GF-0120-3016`
- `rcap-in-custom-pleading::CCA-XP-0120-7002 Form ACR`
- `rcap-in-custom-pleading::Confidential Information Form`

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

- `data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/reuse-index.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/route-obligation-census-v1/identity-resolution/wave-2/**`

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

- data/rcap-grade-a/route-obligation-census-v1/identity-resolution/wave-2/resolved.json

## Focused tests

- `node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active and a
mutation harness that leaves a tracked file altered will fail their runs, not
only yours.

## Stop conditions

An identity that cannot be settled from committed records is recorded unresolved with what would settle it. A wrong resolution sends someone to acquire the wrong document, which is worse than an open row.

Stopping with an honest account of what is missing is a complete return. A
result reported as done on evidence nobody opened is not.

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record
keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/first-wave-c8-source-identity bc504a3e1b160e153a7393ed8673f3e784c0a8c7
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/first-wave-c8-source-identity`.
