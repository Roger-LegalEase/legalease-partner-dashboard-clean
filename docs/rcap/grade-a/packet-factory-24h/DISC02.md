# DISC02

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
  --assignment-id DISC02 \
  --source-obligation 'composed-treatment:sc_17_22_950_summary::NO_DOCUMENT_SOURCE_NAMED' \
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

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**43 obligations · 10 families this lane WOULD release if every one of them resolves · hosts: ID, IN, MI, MO, MT, SC, WI**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Required operation record schema

- itemId
- sourceId
- jurisdiction
- issuingAuthority
- officialTitle
- formNumber
- revision
- officialUrl
- urlKind
- intendedPacketRole
- statewideOrLocal
- familyIds
- evidencePaths
- handoffOperation

### Exact obligation rows

| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `composed-treatment:sc_17_22_950_summary::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | SC | `exact-source-identity` | `composed-treatment:sc_17_22_950_summary` | unresolved exact identity or URL | `ACQ` |
| `id_felony_reduction-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | ID | `exact-source-identity` | `id_felony_reduction-set` | unresolved exact identity or URL | `ACQ` |
| `id_isp_expungement-set::official-form:ISP-BCI-EXPUNGEMENT-APPLICATION` | `official-form:ISP-BCI-EXPUNGEMENT-APPLICATION` | ID | `exact-source-identity` | `id_isp_expungement-set` | unresolved exact identity or URL | `ACQ` |
| `id_set_aside_dismissal-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | ID | `exact-source-identity` | `id_set_aside_dismissal-set` | unresolved exact identity or URL | `ACQ` |
| `in_arrest_no_charges-set::official-form:CCA Section 1 expungement order` | `official-form:CCA Section 1 expungement order` | IN | `exact-source-identity` | `in_arrest_no_charges-set` | unresolved exact identity or URL | `ACQ` |
| `in_arrest_no_charges-set::official-form:CCA Section 1 non-conviction expungement petition` | `official-form:CCA Section 1 non-conviction expungement petition` | IN | `exact-source-identity` | `in_arrest_no_charges-set` | unresolved exact identity or URL | `ACQ` |
| `in_arrest_no_charges-set::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `in_arrest_no_charges-set` | unresolved exact identity or URL | `ACQ` |
| `in_arrest_no_charges-set::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `in_arrest_no_charges-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_d6-set::official-form:CCA conviction expungement order` | `official-form:CCA conviction expungement order` | IN | `exact-source-identity` | `in_conviction_d6-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_d6-set::official-form:CCA conviction expungement petition` | `official-form:CCA conviction expungement petition` | IN | `exact-source-identity` | `in_conviction_d6-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_d6-set::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `in_conviction_d6-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_d6-set::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `in_conviction_d6-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_felony-set::official-form:CCA conviction expungement order` | `official-form:CCA conviction expungement order` | IN | `exact-source-identity` | `in_conviction_felony-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_felony-set::official-form:CCA conviction expungement petition` | `official-form:CCA conviction expungement petition` | IN | `exact-source-identity` | `in_conviction_felony-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_felony-set::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `in_conviction_felony-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_felony-set::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `in_conviction_felony-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_misd-set::official-form:CCA conviction expungement order` | `official-form:CCA conviction expungement order` | IN | `exact-source-identity` | `in_conviction_misd-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_misd-set::official-form:CCA conviction expungement petition` | `official-form:CCA conviction expungement petition` | IN | `exact-source-identity` | `in_conviction_misd-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_misd-set::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `in_conviction_misd-set` | unresolved exact identity or URL | `ACQ` |
| `in_conviction_misd-set::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `in_conviction_misd-set` | unresolved exact identity or URL | `ACQ` |
| `in_infraction_nondisclosure-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | IN | `exact-source-identity` | `in_infraction_nondisclosure-set` | unresolved exact identity or URL | `ACQ` |
| `in_section1_petition-set::official-form:CCA Section 1 expungement order` | `official-form:CCA Section 1 expungement order` | IN | `exact-source-identity` | `in_section1_petition-set` | unresolved exact identity or URL | `ACQ` |
| `in_section1_petition-set::official-form:CCA Section 1 non-conviction expungement petition` | `official-form:CCA Section 1 non-conviction expungement petition` | IN | `exact-source-identity` | `in_section1_petition-set` | unresolved exact identity or URL | `ACQ` |
| `in_section1_petition-set::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `in_section1_petition-set` | unresolved exact identity or URL | `ACQ` |
| `in_section1_petition-set::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `in_section1_petition-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_application-set::official-form:MC 227` | `official-form:MC 227` | MI | `exact-source-identity` | `mi_setaside_application-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_application-set::official-form:MC 227 page 3 Proof of Service` | `official-form:MC 227 page 3 Proof of Service` | MI | `exact-source-identity` | `mi_setaside_application-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_first_owi-set::official-form:MC 227 item 2.c` | `official-form:MC 227 item 2.c` | MI | `exact-source-identity` | `mi_setaside_first_owi-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_first_owi-set::official-form:MC 227 page 3 Proof of Service` | `official-form:MC 227 page 3 Proof of Service` | MI | `exact-source-identity` | `mi_setaside_first_owi-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_trafficking-set::official-form:Proof of Service` | `official-form:Proof of Service` | MI | `exact-source-identity` | `mi_setaside_trafficking-set` | unresolved exact identity or URL | `ACQ` |
| `mo-610-145-mistaken-identity-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MO | `exact-source-identity` | `mo-610-145-mistaken-identity-set` | unresolved exact identity or URL | `ACQ` |
| `mt_deferred_dismissal-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MT | `exact-source-identity` | `mt_deferred_dismissal-set` | unresolved exact identity or URL | `ACQ` |
| `mt_misdemeanor_expungement-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MT | `exact-source-identity` | `mt_misdemeanor_expungement-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_completed-set::official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | `official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | MT | `exact-source-identity` | `mt_mmrta_completed-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_completed-set::official-form:MT-FORM-B` | `official-form:MT-FORM-B` | MT | `exact-source-identity` | `mt_mmrta_completed-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_completed-set::official-form:MT-OCA-MMRTA` | `official-form:MT-OCA-MMRTA` | MT | `exact-source-identity` | `mt_mmrta_completed-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_serving-set::official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | `official-form:EXPUNGEMENTREMOVALREQUESTFORM.DOCX` | MT | `exact-source-identity` | `mt_mmrta_serving-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_serving-set::official-form:MT-FORM-A` | `official-form:MT-FORM-A` | MT | `exact-source-identity` | `mt_mmrta_serving-set` | unresolved exact identity or URL | `ACQ` |
| `mt_mmrta_serving-set::official-form:MT-OCA-MMRTA` | `official-form:MT-OCA-MMRTA` | MT | `exact-source-identity` | `mt_mmrta_serving-set` | unresolved exact identity or URL | `ACQ` |
| `rcap-in-custom-pleading::official-form:CCA-XP-0120-7002 Form ACR` | `official-form:CCA-XP-0120-7002 Form ACR` | IN | `exact-source-identity` | `rcap-in-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-in-custom-pleading::official-form:Confidential Information Form` | `official-form:Confidential Information Form` | IN | `exact-source-identity` | `rcap-in-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-mo-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MO | `exact-source-identity` | `rcap-mo-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-wi-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WI | `exact-source-identity` | `rcap-wi-custom-pleading` | unresolved exact identity or URL | `ACQ` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC02 --source-obligation 'composed-treatment:sc_17_22_950_summary::NO_DOCUMENT_SOURCE_NAMED' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`composed-treatment:sc_17_22_950_summary`, `id_felony_reduction-set`, `id_isp_expungement-set`, `id_set_aside_dismissal-set`, `in_infraction_nondisclosure-set`, `mi_setaside_application-set`, `mi_setaside_first_owi-set`, `mi_setaside_trafficking-set`, `rcap-mo-custom-pleading`, `rcap-wi-custom-pleading`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc02/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc02/**`

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

- data/rcap-grade-a/packet-factory-24h/disc02/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc02/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
