# SRC01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-identity-acquisition-promotion
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `40ccc028a2af8eac94743cdb32237e3af56a6642` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family al-diversion-set::official-form:CR-65 \
  --codex-cloud \
  --minimum-captain-sha 40ccc028a2af8eac94743cdb32237e3af56a6642
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**. A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Mission

Acquire the exact published edition of every form number the census names and the corpus does not carry, one issuing host at a time.

## What bounds this lane

the issuing court or agency that publishes each named form number

**121 obligations · 78 families released if all clear · hosts: AL, AR, AZ, CA, CO, DE, FL, HI, ID, IN, KY, MA, MD, ME, MN, NC, ND, NE, NH, NM, RI, UT, WV**

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Every acquired or promoted source records

- official publisher
- exact title
- form number
- revision
- official URL
- MIME type
- page count
- technology (acroform, xfa, flat)
- SHA-256
- byte size
- custody path

**As soon as a family becomes source-ready, report it in the checkpoint. Captain assigns it to the next available PF lane without waiting for this lane to finish.**

### Families this lane releases

`al-diversion-set`, `al-felony-dwop-set`, `al-felony-nonconviction-90-set`, `al-misd-conviction-set`, `al-misd-dwop-set`, `al-misd-nonconviction-90-set`, `al-pardon-set`, `al-pardoned-felony-set`, `al-trafficking-set`, `ar-act531-set`, `az_certificate_second_chance-set`, `az_marijuana_expungement_limited_jurisdiction-set`, `az_record_sealing_conviction-set`, `az_set_aside-set`, `ca-diversion-seal-set`, `co_municipal_conviction_seal-set`, `co_petition_seal_arrest-set`, `composed-treatment:nc_146_dismissal_petition`, `de_discretionary_family_court-set`, `de_discretionary_superior_court-set`, `de_pardon_expungement-set`, `fl-10yr-bridge-set`, `fl-expunction-set`, `fl-sealing-set`, `fl-trafficking-set`, `hi_712_1200_deferred_expungement-set`, `hi_dag_danc_expungement-set`, `hi_nonconviction_expungement-set`, `id_clean_slate_shield-set`, `in_arrest_no_charges-set`, `in_conviction_d6-set`, `in_conviction_felony-set`, `in_conviction_misd-set`, `in_section1_petition-set`, `ky_expungement_certification-set`, `ky_nonconviction_expungement-set`, `ky_protective_order_record_expungement-set`, `ma-seal-court-set`, `md_10105_early-set`, `md_10105_favorable-set`, `md_10110_conviction-set`, `md_cannabis_petition-set`, `md_pardon_expungement-set`, `me-seal-gen-set`, `me-seal-survivor-set`, `mn_petition_15218-set`, `mn_petition_609a02_subd3-set`, `mn_petition_juvenile_as_adult-set`, `nc_145_5_felony-set`, `nc_145_5_misdemeanor-set`, `nc_145_8a_youthful-set`, `nc_146_acquittal_petition-set`, `nc_146_dismissal_petition-set`, `nc_auto_146_a4_agency_followup-set`, `nd-regular-pardon-set`, `nd-summary-marijuana-pardon-set`, `ne-seal-pardoned-set`, `ne-seal-pre2017-set`, `nh_conviction_standard-set`, `nh_conviction_streamlined-set`, `nh_marijuana_annulment-set`, `nh_petition_nonconviction_pre2019-set`, `nh_petition_vacated-set`, `nm_conviction-set`, `nm_identity_theft-set`, `nm_release_without_conviction-set`, `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b`, `rcap-hi-custom-pleading`, `rcap-in-custom-pleading`, `ri_decriminalized-set`, `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`, `ut_pet_cannabis-set`, `ut_pet_remove_link-set`, `ut_pet_special_certificate-set`, `wv_acc_treatment_job_readiness-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src01/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src01/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8a-nj-disorderly-persons/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8b-ca-17b-reduction/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8c-ca-1203-43/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8d-az-marijuana-superior-court/**`
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-summary-conviction-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-dismissed-without-prejudice-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-homicide-victim-prostitution-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/src01/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src01/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
