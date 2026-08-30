# C11_PACKET_FACTORY_ACCELERATOR

**Archetype:** Highest-value buildable official-form, composed-pleading and agency-application packet families
**Lane:** packet
**Worker branch:** `codex/c11-packet-factory-accelerator`
**Branch from:** `227f095d5d1493feca56779cf60c6f177caebd61` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Build the 47 packet families whose source bytes are already held and whose reuse decision is NO_EXISTING_WORK. Nothing here has evidence anywhere: the six families already built in the tree and the six finished on branches are excluded by the reuse index, not by anyone remembering.

## OFFICIAL PDF FILL — 43 items

**Reuse decision:** NO_EXISTING_WORK. Each family's source binds by exact SHA-256 before a field is written.

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

## COMPOSED PLEADING AND AGENCY APPLICATION — 4 items

**Reuse decision:** NO_EXISTING_WORK. The output vehicle is a legal-design decision. A family whose vehicle is unresolved in its memo stops.

- `ne-setaside-noncustodial-set`
- `oh_marijuana_expungement-set`
- `pa_6308_underage-set`
- `rcap-oh-custom-pleading-clean-tracks`

## Packet families implicated

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
- `ne-setaside-noncustodial-set`
- `oh_marijuana_expungement-set`
- `pa_6308_underage-set`
- `rcap-oh-custom-pleading-clean-tracks`

Nothing outside this scope belongs to you. Every row here is allocated to you and to no other lane; the dispatch refuses to generate if two lanes claim one row.

## Required inputs

- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md`
- `data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json`
- `data/rcap-grade-a/stale-artifact-block.json`

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/**  (only the families listed in this assignment)`
- `data/rcap-all50/pleadings/**  (only the families listed in this assignment)`
- `scripts/build-census-v1-<family>.mjs`

## Prohibited paths — never write here

- `data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json`
- `docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md`
- `data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`

## Required outputs

- per official-PDF family: one field census, field map, canonical and boundary fixtures, an actual-write report and page rasters
- per composed family: one pleading configuration, fixtures, rendered output and participant instructions

## Focused tests

- `node scripts/verify-packet-build-environment.mjs --family <family>`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active, and a mutation harness that leaves a tracked file altered fails their runs, not only yours.

## Stop conditions

- The packet-build environment preflight must print PACKET_BUILD_ENVIRONMENT_READY 14/14 before anything is written. A family whose source does not bind by exact SHA-256 stops.
- Never prefill a participant signature, a signature date, a certificate of mailing before actual mailing, or any court-only or prosecutor-only field.
- A family whose output vehicle is unresolved in its legal-design memo stops and is reported; the vehicle is a legal-design decision, not a build choice.

Stopping with an honest account of what is missing is a complete return. A result reported as done on evidence nobody opened is not.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
FAMILIES BUILT:
FAMILIES STOPPED:
PREFLIGHT:
SOURCES BOUND BY SHA-256:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/c11-packet-factory-accelerator 227f095d5d1493feca56779cf60c6f177caebd61
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/c11-packet-factory-accelerator`.
