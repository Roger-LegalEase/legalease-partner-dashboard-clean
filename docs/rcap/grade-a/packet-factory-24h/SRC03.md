# SRC03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER SRC PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id SRC03 \
  --source-obligation 'az_certificate_second_chance-set::official-form:AOCCRSA3F-010122' \
  --codex-cloud \
  --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59
```

It must print **`SOURCE_CONVEYOR_PREFLIGHT_READY`**. The lane gate and each owned row gate must both pass.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Claim before you read

- Assert every family before reading or writing anything: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC03 <familyId>`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Release each family when it is finished: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC03 <familyId>`, and leave that in your diff.

## How to raster

- Page rasters go through `scripts/lib/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.

## What bounds this lane

the private corpus and the committed inventory, read only — nothing is fetched here

**48 obligations · 17 families this lane WOULD release if every one of them resolves · hosts: AZ, GA, ID, MA, MT, NH, NM, WV**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Required operation record schema

- itemId
- sourceId
- corpusPath
- title/formNumber
- sha256
- byteSize
- mime
- pageCount
- technology
- matchBasis
- familyIds
- handoffOperation

### Exact obligation rows

| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `az_certificate_second_chance-set::official-form:AOCCRSA3F-010122` | `official-form:AOCCRSA3F-010122` | AZ | `held-inventory-reconciliation` | `az_certificate_second_chance-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_certificate_second_chance-set::official-form:AOCCRSA4F-010122` | `official-form:AOCCRSA4F-010122` | AZ | `held-inventory-reconciliation` | `az_certificate_second_chance-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_marijuana_expungement_limited_jurisdiction-set::official-form:AOC-CREM2F-071221-CONT` | `official-form:AOC-CREM2F-071221-CONT` | AZ | `held-inventory-reconciliation` | `az_marijuana_expungement_limited_jurisdiction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_record_sealing_conviction-set::official-form:AOCCRSL1F-050825-CONT` | `official-form:AOCCRSL1F-050825-CONT` | AZ | `held-inventory-reconciliation` | `az_record_sealing_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_set_aside-set::official-form:AOCCR41FORM31A-082224` | `official-form:AOCCR41FORM31A-082224` | AZ | `held-inventory-reconciliation` | `az_set_aside-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_set_aside-set::official-form:AOCCR41FORM31A-082224-CONT` | `official-form:AOCCR41FORM31A-082224-CONT` | AZ | `held-inventory-reconciliation` | `az_set_aside-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `az_set_aside-set::official-form:AOCCR41FORM31B-082224` | `official-form:AOCCR41FORM31B-082224` | AZ | `held-inventory-reconciliation` | `az_set_aside-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ga-fo-active-pre2026-set::source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5` | `source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5` | GA | `held-inventory-reconciliation` | `ga-fo-active-pre2026-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ga-fo-active-pre2026-set::source-sha256:91ff699f809ee9c78e9c0fe1e99a392624b01e0173f4754bf80a8bd3410cdec8` | `source-sha256:91ff699f809ee9c78e9c0fe1e99a392624b01e0173f4754bf80a8bd3410cdec8` | GA | `held-inventory-reconciliation` | `ga-fo-active-pre2026-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ga-fo-discharged-pre2026-set::source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5` | `source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5` | GA | `held-inventory-reconciliation` | `ga-fo-discharged-pre2026-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ga-fo-discharged-pre2026-set::source-sha256:91ff699f809ee9c78e9c0fe1e99a392624b01e0173f4754bf80a8bd3410cdec8` | `source-sha256:91ff699f809ee9c78e9c0fe1e99a392624b01e0173f4754bf80a8bd3410cdec8` | GA | `held-inventory-reconciliation` | `ga-fo-discharged-pre2026-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ga-nonconv-pre2013-set::official-form:GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013` | `official-form:GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013` | GA | `held-inventory-reconciliation` | `ga-nonconv-pre2013-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `id_clean_slate_shield-set::official-form:ISC-PETITION-TO-SHIELD-67-3004-11` | `official-form:ISC-PETITION-TO-SHIELD-67-3004-11` | ID | `held-inventory-reconciliation` | `id_clean_slate_shield-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ma-seal-court-set::official-form:TC0057` | `official-form:TC0057` | MA | `held-inventory-reconciliation` | `ma-seal-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_deferred_dismissal-set::official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | `official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | MT | `held-inventory-reconciliation` | `mt_deferred_dismissal-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_misdemeanor_expungement-set::official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | `official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | MT | `held-inventory-reconciliation` | `mt_misdemeanor_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_completed-set::source-sha256:2e38c3c680bc1c10932e017472a39e676ae4a7ad89621790b20a9803b548db7e` | `source-sha256:2e38c3c680bc1c10932e017472a39e676ae4a7ad89621790b20a9803b548db7e` | MT | `held-inventory-reconciliation` | `mt_mmrta_completed-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_completed-set::source-sha256:4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7` | `source-sha256:4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7` | MT | `held-inventory-reconciliation` | `mt_mmrta_completed-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_completed-set::source-sha256:cb2fa9c3d9f38b0b7b0b11b503b05c91cd61c491ad37b74ea1298a6f12747207` | `source-sha256:cb2fa9c3d9f38b0b7b0b11b503b05c91cd61c491ad37b74ea1298a6f12747207` | MT | `held-inventory-reconciliation` | `mt_mmrta_completed-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_completed-set::source-sha256:d9096c176ca3ac4efb5de0dfd76f0b245ea1487fe1b1b76f265c8a9d6ce6aec9` | `source-sha256:d9096c176ca3ac4efb5de0dfd76f0b245ea1487fe1b1b76f265c8a9d6ce6aec9` | MT | `held-inventory-reconciliation` | `mt_mmrta_completed-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_serving-set::source-sha256:2e38c3c680bc1c10932e017472a39e676ae4a7ad89621790b20a9803b548db7e` | `source-sha256:2e38c3c680bc1c10932e017472a39e676ae4a7ad89621790b20a9803b548db7e` | MT | `held-inventory-reconciliation` | `mt_mmrta_serving-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_serving-set::source-sha256:4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7` | `source-sha256:4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7` | MT | `held-inventory-reconciliation` | `mt_mmrta_serving-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_serving-set::source-sha256:968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d` | `source-sha256:968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d` | MT | `held-inventory-reconciliation` | `mt_mmrta_serving-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mt_mmrta_serving-set::source-sha256:d9096c176ca3ac4efb5de0dfd76f0b245ea1487fe1b1b76f265c8a9d6ce6aec9` | `source-sha256:d9096c176ca3ac4efb5de0dfd76f0b245ea1487fe1b1b76f265c8a9d6ce6aec9` | MT | `held-inventory-reconciliation` | `mt_mmrta_serving-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_conviction_standard-set::official-form:NHJB-2317-DSe` | `official-form:NHJB-2317-DSe` | NH | `held-inventory-reconciliation` | `nh_conviction_standard-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_conviction_standard-set::official-form:NHJB-3057-DSe` | `official-form:NHJB-3057-DSe` | NH | `held-inventory-reconciliation` | `nh_conviction_standard-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_conviction_streamlined-set::official-form:NHJB-3057-DSe` | `official-form:NHJB-3057-DSe` | NH | `held-inventory-reconciliation` | `nh_conviction_streamlined-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_marijuana_annulment-set::official-form:NHJB-3124-DS` | `official-form:NHJB-3124-DS` | NH | `held-inventory-reconciliation` | `nh_marijuana_annulment-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_petition_nonconviction_pre2019-set::official-form:NHJB-2317-DSe` | `official-form:NHJB-2317-DSe` | NH | `held-inventory-reconciliation` | `nh_petition_nonconviction_pre2019-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nh_petition_vacated-set::official-form:NHJB-2317-DSe` | `official-form:NHJB-2317-DSe` | NH | `held-inventory-reconciliation` | `nh_petition_vacated-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-222` | `official-form:4-222` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-953` | `official-form:4-953` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-956` | `official-form:4-956` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-960` | `official-form:4-960` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-960.1` | `official-form:4-960.1` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_conviction-set::official-form:4-960.3` | `official-form:4-960.3` | NM | `held-inventory-reconciliation` | `nm_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_identity_theft-set::official-form:4-222` | `official-form:4-222` | NM | `held-inventory-reconciliation` | `nm_identity_theft-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_identity_theft-set::official-form:4-951` | `official-form:4-951` | NM | `held-inventory-reconciliation` | `nm_identity_theft-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_identity_theft-set::official-form:4-960.1` | `official-form:4-960.1` | NM | `held-inventory-reconciliation` | `nm_identity_theft-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-222` | `official-form:4-222` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-952` | `official-form:4-952` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-955` | `official-form:4-955` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-959` | `official-form:4-959` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-960.1` | `official-form:4-960.1` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nm_release_without_conviction-set::official-form:4-960.2` | `official-form:4-960.2` | NM | `held-inventory-reconciliation` | `nm_release_without_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_acc_treatment_job_readiness-set::official-form:SCA-C907` | `official-form:SCA-C907` | WV | `held-inventory-reconciliation` | `wv_acc_treatment_job_readiness-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_acc_treatment_job_readiness-set::source-sha256:2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222` | `source-sha256:2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222` | WV | `held-inventory-reconciliation` | `wv_acc_treatment_job_readiness-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_conv_nonviolent_felony-set::official-form:SCA-C907` | `official-form:SCA-C907` | WV | `held-inventory-reconciliation` | `wv_conv_nonviolent_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC03 --source-obligation 'az_certificate_second_chance-set::official-form:AOCCRSA3F-010122' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`az_certificate_second_chance-set`, `az_marijuana_expungement_limited_jurisdiction-set`, `az_record_sealing_conviction-set`, `az_set_aside-set`, `ga-fo-active-pre2026-set`, `ga-fo-discharged-pre2026-set`, `id_clean_slate_shield-set`, `ma-seal-court-set`, `nh_conviction_standard-set`, `nh_conviction_streamlined-set`, `nh_marijuana_annulment-set`, `nh_petition_nonconviction_pre2019-set`, `nh_petition_vacated-set`, `nm_conviction-set`, `nm_identity_theft-set`, `nm_release_without_conviction-set`, `wv_acc_treatment_job_readiness-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| NHJB-2311 | NH | 5 |
| EXPUNGEMENTREMOVALREQUESTFORM.DOCX | MT | 4 |
| 4-222 | NM | 3 |
| SCA-C907 | WV | 2 |
| AOCCRSA3F-010122 | AZ | 1 |
| AOC-CREM2F-071221 | AZ | 1 |
| AOCCRSL1F-050825 | AZ | 1 |
| AOCCR41FORM31A-082224 | AZ | 1 |
| GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013 | GA | 1 |
| ISC-PETITION-TO-SHIELD-67-3004-11 | ID | 1 |
| TC0057 | MA | 1 |
| NO_DOCUMENT_SOURCE_NAMED | GA | 0 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src03/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src03/**`

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

- data/rcap-grade-a/packet-factory-24h/src03/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src03/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- NEVER promote a source without exact bytes. A promotion is a release, and a released family goes to a builder that will try to open the file.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an obligation that cannot be settled here is STOPPED naming the exact host and the next operation that owns it.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
OPERATION:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
HANDED OFF:
FAMILIES RELEASED:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
PROMOTIONS WITHOUT EXACT BYTES: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
