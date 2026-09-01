# SOURCE_1_NAMED_FORM_NUMBER_ACQUISITION

**Engine:** Codex  ·  **Lane:** source-identity-acquisition-promotion  ·  **Sequence:** 2
**Worker branch:** `codex/source-01-named-form-number-acquisition`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Acquire the exact published edition of every form number the census names and the corpus does not carry, one issuing host at a time.

## What bounds this lane

the issuing court or agency that publishes each named form number

These are the obligations standing between the 74 families in this class and tomorrow's build queue. Clearing one releases the families that name it; clearing none holds the build lanes at today's ceiling.

**114 obligations · 74 families released if all clear · hosts: AL, AR, AZ, CA, CO, DE, FL, HI, ID, IN, KY, MA, MD, ME, MN, NC, ND, NE, NH, NM, RI, UT, WV**

Absence classes: named_form_number_not_in_corpus.

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Families this lane releases

`al-diversion-set`, `al-felony-dwop-set`, `al-felony-nonconviction-90-set`, `al-misd-conviction-set`, `al-misd-dwop-set`, `al-misd-nonconviction-90-set`, `al-pardon-set`, `al-pardoned-felony-set`, `al-trafficking-set`, `ar-act531-set`, `az_certificate_second_chance-set`, `az_marijuana_expungement_limited_jurisdiction-set`, `az_record_sealing_conviction-set`, `az_set_aside-set`, `ca-diversion-seal-set`, `co_municipal_conviction_seal-set`, `co_petition_seal_arrest-set`, `de_discretionary_family_court-set`, `de_discretionary_superior_court-set`, `de_pardon_expungement-set`, `fl-10yr-bridge-set`, `fl-expunction-set`, `fl-sealing-set`, `fl-trafficking-set`, `hi_712_1200_deferred_expungement-set`, `hi_dag_danc_expungement-set`, `hi_nonconviction_expungement-set`, `id_clean_slate_shield-set`, `in_arrest_no_charges-set`, `in_conviction_d6-set`, `in_conviction_felony-set`, `in_conviction_misd-set`, `in_section1_petition-set`, `ky_expungement_certification-set`, `ky_nonconviction_expungement-set`, `ky_protective_order_record_expungement-set`, `ma-seal-court-set`, `md_10105_early-set`, `md_10105_favorable-set`, `md_10110_conviction-set`, `md_cannabis_petition-set`, `md_pardon_expungement-set`, `me-seal-gen-set`, `me-seal-survivor-set`, `mn_petition_15218-set`, `mn_petition_609a02_subd3-set`, `mn_petition_juvenile_as_adult-set`, `nc_145_5_felony-set`, `nc_145_5_misdemeanor-set`, `nc_145_8a_youthful-set`, `nc_146_acquittal_petition-set`, `nc_146_dismissal_petition-set`, `nc_auto_146_a4_agency_followup-set`, `nd-regular-pardon-set`, `nd-summary-marijuana-pardon-set`, `ne-seal-pardoned-set`, `ne-seal-pre2017-set`, `nh_conviction_standard-set`, `nh_conviction_streamlined-set`, `nh_marijuana_annulment-set`, `nh_petition_nonconviction_pre2019-set`, `nh_petition_vacated-set`, `nm_conviction-set`, `nm_identity_theft-set`, `nm_release_without_conviction-set`, `ri_decriminalized-set`, `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`, `ut_pet_cannabis-set`, `ut_pet_remove_link-set`, `ut_pet_special_certificate-set`, `wv_acc_treatment_job_readiness-set`

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/source-01-named-form-number-acquisition/**`
- `data/rcap-grade-a/source-acquisition/mass-production/source-01-named-form-number-acquisition/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/mass-production/source-01-named-form-number-acquisition/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/mass-production/source-01-named-form-number-acquisition/receipts.json — for anything resolved, the exact form number or SHA-256 and where it was found; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from, never a near-match promoted to an identity.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/source-01-named-form-number-acquisition 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-source-01-named-form-number-acquisition.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/source-01-named-form-number-acquisition`.
