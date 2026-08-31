# DISC05

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER DISC PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id DISC05 \
  --source-obligation 'ar-act346-set::official-form:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS' \
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

- Assert each exact source obligation before reading evidence: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert DISC05 <itemId>`
- The committed assignment contains exactly 42 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release DISC05 <itemId>`.

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**42 obligations · 23 families this lane WOULD release if every one of them resolves · hosts: AR, AZ, DE, IA, KS, MN, SD, WV**

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
| `ar-act346-set::official-form:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS` | `official-form:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS` | AR | `exact-source-identity` | `ar-act346-set` | unresolved exact identity or URL | `ACQ` |
| `ar-cs-possession-seal-set::official-form:ACIC-ORDER-TO-SEAL-CS-POSSESSION` | `official-form:ACIC-ORDER-TO-SEAL-CS-POSSESSION` | AR | `exact-source-identity` | `ar-cs-possession-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-cs-possession-seal-set::official-form:ACIC-PETITION-TO-SEAL-CS-POSSESSION` | `official-form:ACIC-PETITION-TO-SEAL-CS-POSSESSION` | AR | `exact-source-identity` | `ar-cs-possession-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-drug-court-set::official-form:ACIC-ORDER-DRUG-COURT` | `official-form:ACIC-ORDER-DRUG-COURT` | AR | `exact-source-identity` | `ar-drug-court-set` | unresolved exact identity or URL | `ACQ` |
| `ar-drug-court-set::official-form:ACIC-PETITION-DRUG-COURT` | `official-form:ACIC-PETITION-DRUG-COURT` | AR | `exact-source-identity` | `ar-drug-court-set` | unresolved exact identity or URL | `ACQ` |
| `ar-felony-seal-set::official-form:ACIC-UNIFORM-ORDER-TO-SEAL` | `official-form:ACIC-UNIFORM-ORDER-TO-SEAL` | AR | `exact-source-identity` | `ar-felony-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-felony-seal-set::official-form:ACIC-UNIFORM-PETITION-TO-SEAL` | `official-form:ACIC-UNIFORM-PETITION-TO-SEAL` | AR | `exact-source-identity` | `ar-felony-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-misdemeanor-seal-set::official-form:ACIC-UNIFORM-ORDER-TO-SEAL` | `official-form:ACIC-UNIFORM-ORDER-TO-SEAL` | AR | `exact-source-identity` | `ar-misdemeanor-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-misdemeanor-seal-set::official-form:ACIC-UNIFORM-PETITION-TO-SEAL` | `official-form:ACIC-UNIFORM-PETITION-TO-SEAL` | AR | `exact-source-identity` | `ar-misdemeanor-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-nonconviction-seal-set::official-form:ACIC-ORDER-TO-SEAL-NONCONVICTION` | `official-form:ACIC-ORDER-TO-SEAL-NONCONVICTION` | AR | `exact-source-identity` | `ar-nonconviction-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-nonconviction-seal-set::official-form:ACIC-PETITION-TO-SEAL-NONCONVICTION` | `official-form:ACIC-PETITION-TO-SEAL-NONCONVICTION` | AR | `exact-source-identity` | `ar-nonconviction-seal-set` | unresolved exact identity or URL | `ACQ` |
| `ar-veterans-court-set::official-form:ACIC-ORDER-VETERANS-COURT` | `official-form:ACIC-ORDER-VETERANS-COURT` | AR | `exact-source-identity` | `ar-veterans-court-set` | unresolved exact identity or URL | `ACQ` |
| `ar-veterans-court-set::official-form:ACIC-PETITION-VETERANS-COURT` | `official-form:ACIC-PETITION-VETERANS-COURT` | AR | `exact-source-identity` | `ar-veterans-court-set` | unresolved exact identity or URL | `ACQ` |
| `az_wrongful_arrest_clearance-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | AZ | `exact-source-identity` | `az_wrongful_arrest_clearance-set` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | DE | `exact-source-identity` | `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | DE | `exact-source-identity` | `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | SD | `exact-source-identity` | `composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WV | `exact-source-identity` | `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:sd_sis_sealing::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | SD | `exact-source-identity` | `composed-treatment:sd_sis_sealing` | unresolved exact identity or URL | `ACQ` |
| `de_mandatory_expungement-set::official-form:DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION` | `official-form:DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION` | DE | `exact-source-identity` | `de_mandatory_expungement-set` | unresolved exact identity or URL | `ACQ` |
| `ia-12346-set::official-form:Certification of Service by Mailing or Delivery` | `official-form:Certification of Service by Mailing or Delivery` | IA | `exact-source-identity` | `ia-12346-set` | unresolved exact identity or URL | `ACQ` |
| `ia-12346-set::official-form:Rule 2.86 Form 3` | `official-form:Rule 2.86 Form 3` | IA | `exact-source-identity` | `ia-12346-set` | unresolved exact identity or URL | `ACQ` |
| `ia-12347-set::official-form:Certification of Service by Mailing or Delivery` | `official-form:Certification of Service by Mailing or Delivery` | IA | `exact-source-identity` | `ia-12347-set` | unresolved exact identity or URL | `ACQ` |
| `ia-7251-set::official-form:Certification of Service by Mailing or Delivery` | `official-form:Certification of Service by Mailing or Delivery` | IA | `exact-source-identity` | `ia-7251-set` | unresolved exact identity or URL | `ACQ` |
| `ia-901c2-set::official-form:Certification of Service by Mailing or Delivery` | `official-form:Certification of Service by Mailing or Delivery` | IA | `exact-source-identity` | `ia-901c2-set` | unresolved exact identity or URL | `ACQ` |
| `ia-901c2-set::official-form:Rule 2.86 Form 1` | `official-form:Rule 2.86 Form 1` | IA | `exact-source-identity` | `ia-901c2-set` | unresolved exact identity or URL | `ACQ` |
| `ia-901c3-set::official-form:Certification of Service by Mailing or Delivery` | `official-form:Certification of Service by Mailing or Delivery` | IA | `exact-source-identity` | `ia-901c3-set` | unresolved exact identity or URL | `ACQ` |
| `ia-901c3-set::official-form:Rule 2.86 Form 2` | `official-form:Rule 2.86 Form 2` | IA | `exact-source-identity` | `ia-901c3-set` | unresolved exact identity or URL | `ACQ` |
| `ia-901c3-set::official-form:Rule 2.86 Form 2 attached sheet` | `official-form:Rule 2.86 Form 2 attached sheet` | IA | `exact-source-identity` | `ia-901c3-set` | unresolved exact identity or URL | `ACQ` |
| `ia-dci77-set::official-form:DCI-76 Criminal History Record Check Billing Form` | `official-form:DCI-76 Criminal History Record Check Billing Form` | IA | `exact-source-identity` | `ia-dci77-set` | unresolved exact identity or URL | `ACQ` |
| `ia-dci77-set::official-form:DCI-77 Criminal History Record Check Request Form` | `official-form:DCI-77 Criminal History Record Check Request Form` | IA | `exact-source-identity` | `ia-dci77-set` | unresolved exact identity or URL | `ACQ` |
| `ks-21-6614-conviction-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-21-6614-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `ks-21-6614-diversion-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-21-6614-diversion-set` | unresolved exact identity or URL | `ACQ` |
| `ks-21-6614-prostitution-coercion-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-21-6614-prostitution-coercion-set` | unresolved exact identity or URL | `ACQ` |
| `ks-21-6614-specialty-court-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-21-6614-specialty-court-set` | unresolved exact identity or URL | `ACQ` |
| `ks-22-2410-arrest-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-22-2410-arrest-set` | unresolved exact identity or URL | `ACQ` |
| `ks-22-4908-registration-relief-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `ks-22-4908-registration-relief-set` | unresolved exact identity or URL | `ACQ` |
| `mn_prosecutor_agreed-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MN | `exact-source-identity` | `mn_prosecutor_agreed-set` | unresolved exact identity or URL | `ACQ` |
| `rcap-ks-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KS | `exact-source-identity` | `rcap-ks-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-wv-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WV | `exact-source-identity` | `rcap-wv-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `wv_conv_nonviolent_felony-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WV | `exact-source-identity` | `wv_conv_nonviolent_felony-set` | unresolved exact identity or URL | `ACQ` |
| `wv_dui_deferral_expungement-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WV | `exact-source-identity` | `wv_dui_deferral_expungement-set` | unresolved exact identity or URL | `ACQ` |

Deterministically assert exactly the 42 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='DISC05');
if (!a || a.items.length !== 42) throw new Error('DISC05 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','DISC05',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC05 --source-obligation 'ar-act346-set::official-form:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`ar-cs-possession-seal-set`, `ar-drug-court-set`, `ar-felony-seal-set`, `ar-misdemeanor-seal-set`, `ar-nonconviction-seal-set`, `ar-veterans-court-set`, `az_wrongful_arrest_clearance-set`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition`, `composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement`, `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement`, `composed-treatment:sd_sis_sealing`, `de_mandatory_expungement-set`, `ia-12346-set`, `ia-12347-set`, `ia-7251-set`, `ia-901c2-set`, `ia-901c3-set`, `ia-dci77-set`, `mn_prosecutor_agreed-set`, `rcap-ks-custom-pleading`, `rcap-wv-custom-pleading`, `wv_dui_deferral_expungement-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| Certification of Service by Mailing or Delivery | IA | 5 |
| KS-CRIMINAL-COVER-SHEET-10-14-2025 | KS | 5 |
| KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | KS | 5 |
| ACIC-UNIFORM-ORDER-TO-SEAL | AR | 2 |
| SCA-C907 | WV | 2 |
| ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS | AR | 1 |
| ACIC-ORDER-TO-SEAL-CS-POSSESSION | AR | 1 |
| ACIC-ORDER-DRUG-COURT | AR | 1 |
| ACIC-ORDER-TO-SEAL-NONCONVICTION | AR | 1 |
| ACIC-ORDER-VETERANS-COURT | AR | 1 |
| DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION | DE | 1 |
| DCI-76 Criminal History Record Check Billing Form | IA | 1 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc05/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc05/**`

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

- data/rcap-grade-a/packet-factory-24h/disc05/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc05/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
PREFLIGHT: SOURCE_CONVEYOR_PREFLIGHT_READY
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
