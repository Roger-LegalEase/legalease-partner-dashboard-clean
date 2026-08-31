# SRC04

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
  --family agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge::NO_DOCUMENT_SOURCE_NAMED \
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

Promote a near-match to an exact identity or refuse it. A token-subset match inside the right jurisdiction is not an identity.

## What bounds this lane

families whose match is a token subset, and those naming no document-shaped source

**109 obligations · 106 families released if all clear · hosts: AK, AL, AR, AZ, CA, CO, CT, DC, DE, GA, ID, IL, IN, KS, KY, MA, ME, MN, MO, MS, ND, NE, NM, NV, NY, OH, OK, OR, PA, RI, SC, SD, TN, UT, VA, VT, WA, WI, WV, WY**

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

`agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge`, `agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request`, `agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission`, `agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement`, `agency-application-treatment:obligation:track-only:CT:ct-destruction-request`, `agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon`, `agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure`, `ar-act346-set`, `ar-arrest-seal-set`, `ar-misdemeanor-dwi-seal-set`, `ar-pardon-seal-set`, `az_marijuana_expungement_arrest_no_charges-set`, `az_wrongful_arrest_clearance-set`, `ca-1203-41-set`, `ca-1203-42-set`, `ca-851-91-set`, `ca-prop64-set`, `census-pending-family:ME:juvenile-sealing`, `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement`, `census-pending-family:UT:path-m-juvenile-expungement`, `census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260`, `composed-treatment:nd-nonconviction-auto-close-verify`, `composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days`, `composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition`, `composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085`, `composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route`, `composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief`, `composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4`, `composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26`, `composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59`, `composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59`, `composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247`, `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief`, `composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement`, `composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement`, `composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement`, `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement`, `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708`, `composed-treatment:sc_17_22_950_summary`, `composed-treatment:sd_sis_sealing`, `ct-cannabis-petition-set`, `ct-decriminalized-set`, `ct-missed-erasure-set`, `ct-nolle-auto-set`, `ct-pardon-erasure-set`, `ct-under18-misdemeanor-set`, `dc_correct_misattributed_arrest-set`, `dc_innocence_expungement-set`, `dc_seal_conviction-set`, `dc_seal_fugitive-set`, `dc_seal_nonconviction-set`, `dc_yra_set_aside-set`, `ga-deaddocket-j3-set`, `ga-felony-j1-set`, `ga-fugitive-j5-set`, `ga-jail-k2-set`, `ga-misd-j4-set`, `ga-nonconv-post2013-set`, `ga-pardon-j7-set`, `ga-seal-m-set`, `ga-vacated-j2-set`, `id_felony_reduction-set`, `id_set_aside_dismissal-set`, `il-prostitution-j-vacate-set`, `in_infraction_nondisclosure-set`, `ky_criminal_record_segregation-set`, `ma-bmc-multi-set`, `me-nonconv-set`, `me-screening-set`, `mn_prosecutor_agreed-set`, `ms-diversion-set`, `ms-fel-set`, `ms-misd-1st-set`, `ms-misd-addl-set`, `ms-nonadj-set`, `ms-nonconv-set`, `nd-deferred-imposition-records-set`, `ne-expunge-le-error-set`, `ne-seal-enforcement-set`, `nv_repository_removal-set`, `nv_seal_probation_family-set`, `ny_mrta_marijuana-set`, `pa_790_nonconviction-set`, `rcap-ga-guidance-implementation`, `rcap-ks-custom-pleading`, `rcap-mo-custom-pleading`, `rcap-ms-custom-pleading`, `rcap-nd-custom-pleading`, `rcap-nv-custom-pleading`, `rcap-oh-custom-pleading-clean-tracks`, `rcap-ok-custom-pleading`, `rcap-or-official-pdf-fill`, `rcap-tn-custom-pleading`, `rcap-wa-custom-pleading-clean-tracks`, `rcap-wi-custom-pleading`, `rcap-wv-custom-pleading`, `ri_marijuana-set`, `ri_nonconviction_sealing-set`, `va_exp_absolute_pardon-set`, `vt_exp_deferred_sentence-set`, `vt_seal_under_25-set`, `wa_crop_certificate_of_restoration-set`, `wv_dui_deferral_expungement-set`, `wy_fel_1502-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src04/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src04/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
- `data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8-completeness-repair-priority-four/**`
- `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/**`
- `scripts/build-census-v1-sd_arrest_expungement-set.mjs`
- `data/rcap-grade-a/codex-cloud/sd-arrest-expungement-disclosure-repair/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-01/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-02/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-03/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/src04/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src04/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
