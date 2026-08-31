# SRC01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id SRC01 \
  --source-obligation 'ca-diversion-seal-set::official-form:SDSC-CRM-307' \
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

- Assert every family before reading or writing anything: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC01 <familyId>`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Release each family when it is finished: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC01 <familyId>`, and leave that in your diff.

## How to raster

- Page rasters go through `scripts/lib/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.

## What bounds this lane

the private corpus and the committed inventory, read only — nothing is fetched here

**49 obligations · 12 families this lane WOULD release if every one of them resolves · hosts: CA, DE, HI, KS, ND, VA**

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
| `ca-diversion-seal-set::official-form:SDSC-CRM-307` | `official-form:SDSC-CRM-307` | CA | `held-inventory-reconciliation` | `ca-diversion-seal-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_family_court-set::official-form:FORM-281` | `official-form:FORM-281` | DE | `held-inventory-reconciliation` | `de_discretionary_family_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_family_court-set::official-form:FORM-281E` | `official-form:FORM-281E` | DE | `held-inventory-reconciliation` | `de_discretionary_family_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_02_A` | `official-form:CIV_EXP_02_A` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_02_B` | `official-form:CIV_EXP_02_B` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_04_A` | `official-form:CIV_EXP_04_A` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_pardon_expungement-set::official-form:CIV_EXP_02_A` | `official-form:CIV_EXP_02_A` | DE | `held-inventory-reconciliation` | `de_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_pardon_expungement-set::official-form:CIV_EXP_08_A` | `official-form:CIV_EXP_08_A` | DE | `held-inventory-reconciliation` | `de_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `hi_712_1200_deferred_expungement-set::official-form:HCJDC-159B` | `official-form:HCJDC-159B` | HI | `held-inventory-reconciliation` | `hi_712_1200_deferred_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `hi_dag_danc_expungement-set::official-form:HCJDC-159B` | `official-form:HCJDC-159B` | HI | `held-inventory-reconciliation` | `hi_dag_danc_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `hi_nonconviction_expungement-set::official-form:HCJDC-159B` | `official-form:HCJDC-159B` | HI | `held-inventory-reconciliation` | `hi_nonconviction_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | `official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KSJC-NOTICE-OF-HEARING-12-2016` | `official-form:KSJC-NOTICE-OF-HEARING-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | `official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | `official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-conviction-set::official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | `official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KSJC-NOTICE-OF-HEARING-12-2016` | `official-form:KSJC-NOTICE-OF-HEARING-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | `official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | `official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-diversion-set::official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | `official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KSJC-NOTICE-OF-HEARING-12-2016` | `official-form:KSJC-NOTICE-OF-HEARING-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | `official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | `official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-prostitution-coercion-set::official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-prostitution-coercion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | `official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KSJC-NOTICE-OF-HEARING-12-2016` | `official-form:KSJC-NOTICE-OF-HEARING-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | `official-form:KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | `official-form:KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-21-6614-specialty-court-set::official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-21-6614-specialty-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-2410-arrest-set::official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | `official-form:KS-CRIMINAL-COVER-SHEET-10-14-2025` | KS | `held-inventory-reconciliation` | `ks-22-2410-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-2410-arrest-set::official-form:KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016` | `official-form:KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016` | KS | `held-inventory-reconciliation` | `ks-22-2410-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-2410-arrest-set::official-form:KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013` | `official-form:KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013` | KS | `held-inventory-reconciliation` | `ks-22-2410-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-4908-registration-relief-set::official-form:KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022` | `official-form:KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022` | KS | `held-inventory-reconciliation` | `ks-22-4908-registration-relief-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-4908-registration-relief-set::official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | `official-form:KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022` | KS | `held-inventory-reconciliation` | `ks-22-4908-registration-relief-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ks-22-4908-registration-relief-set::official-form:KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022` | `official-form:KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022` | KS | `held-inventory-reconciliation` | `ks-22-4908-registration-relief-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nd-regular-pardon-set::official-form:SFN-14859` | `official-form:SFN-14859` | ND | `held-inventory-reconciliation` | `nd-regular-pardon-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nd-summary-marijuana-pardon-set::official-form:SFN-61663` | `official-form:SFN-61663` | ND | `held-inventory-reconciliation` | `nd-summary-marijuana-pardon-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-430` | `official-form:CR-430` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-431` | `official-form:CR-431` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-432` | `official-form:CR-432` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-430-INFO` | `official-form:CR-430-INFO` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `rcap-hi-custom-pleading::official-form:HCJDC-159B` | `official-form:HCJDC-159B` | HI | `held-inventory-reconciliation` | `rcap-hi-custom-pleading` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `va_exp_identity_used_by_another-set::source-sha256:6176c2f55bdb3206c53f4a26a0e6b4c14dfd8b04ee19be0ee52b7b6b3fa4e97f` | `source-sha256:6176c2f55bdb3206c53f4a26a0e6b4c14dfd8b04ee19be0ee52b7b6b3fa4e97f` | VA | `held-inventory-reconciliation` | `va_exp_identity_used_by_another-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC01 --source-obligation 'ca-diversion-seal-set::official-form:SDSC-CRM-307' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`ca-diversion-seal-set`, `de_discretionary_family_court-set`, `de_discretionary_superior_court-set`, `de_pardon_expungement-set`, `hi_712_1200_deferred_expungement-set`, `hi_dag_danc_expungement-set`, `hi_nonconviction_expungement-set`, `nd-regular-pardon-set`, `nd-summary-marijuana-pardon-set`, `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b`, `rcap-hi-custom-pleading`, `va_exp_identity_used_by_another-set`

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

- data/rcap-grade-a/packet-factory-24h/src01/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src01/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
