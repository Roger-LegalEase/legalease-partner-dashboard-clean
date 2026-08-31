# SRC02

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
  --assignment-id SRC02 \
  --source-obligation 'al-diversion-set::official-form:CR-65' \
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

- Assert each exact source obligation before reading evidence: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC02 <itemId>`
- The committed assignment contains exactly 48 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC02 <itemId>`.

## Mission

Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.

## What bounds this lane

the private corpus and the committed inventory, read only — nothing is fetched here

**48 obligations · 35 families this lane WOULD release if every one of them resolves · hosts: AL, CO, MD, MO, NC, NE, RI**

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
| `al-diversion-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-diversion-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-felony-dwop-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-felony-dwop-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-felony-nonconviction-90-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-felony-nonconviction-90-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-misd-conviction-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-misd-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-misd-dwop-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-misd-dwop-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-misd-nonconviction-90-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-misd-nonconviction-90-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-pardon-set::official-form:ABPP-3` | `official-form:ABPP-3` | AL | `held-inventory-reconciliation` | `al-pardon-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-pardoned-felony-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-pardoned-felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `al-trafficking-set::official-form:CR-65` | `official-form:CR-65` | AL | `held-inventory-reconciliation` | `al-trafficking-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `co_municipal_conviction_seal-set::official-form:JDF-684` | `official-form:JDF-684` | CO | `held-inventory-reconciliation` | `co_municipal_conviction_seal-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `co_petition_seal_arrest-set::official-form:JDF-417-ORDER` | `official-form:JDF-417-ORDER` | CO | `held-inventory-reconciliation` | `co_petition_seal_arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `composed-treatment:nc_146_dismissal_petition::official-form:AOC-CR-287-INSTRUCTIONS` | `official-form:AOC-CR-287-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `composed-treatment:nc_146_dismissal_petition` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10105_early-set::official-form:CC-DC-CR-072C` | `official-form:CC-DC-CR-072C` | MD | `held-inventory-reconciliation` | `md_10105_early-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10105_favorable-set::official-form:CC-DC-CR-072A` | `official-form:CC-DC-CR-072A` | MD | `held-inventory-reconciliation` | `md_10105_favorable-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10110_conviction-set::official-form:CC-DC-CR-072B` | `official-form:CC-DC-CR-072B` | MD | `held-inventory-reconciliation` | `md_10110_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_cannabis_petition-set::official-form:CC-DC-CR-072D` | `official-form:CC-DC-CR-072D` | MD | `held-inventory-reconciliation` | `md_cannabis_petition-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_pardon_expungement-set::official-form:CC-DC-CR-072B` | `official-form:CC-DC-CR-072B` | MD | `held-inventory-reconciliation` | `md_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-575-120-identity-theft-correction-set::official-form:CR310` | `official-form:CR310` | MO | `held-inventory-reconciliation` | `mo-575-120-identity-theft-correction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-575-120-identity-theft-correction-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-575-120-identity-theft-correction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-575-120-identity-theft-correction-set::official-form:GN10` | `official-form:GN10` | MO | `held-inventory-reconciliation` | `mo-575-120-identity-theft-correction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-122-arrest-expungement-set::official-form:CR143` | `official-form:CR143` | MO | `held-inventory-reconciliation` | `mo-610-122-arrest-expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-122-arrest-expungement-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-610-122-arrest-expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-122-arrest-expungement-set::official-form:GN10` | `official-form:GN10` | MO | `held-inventory-reconciliation` | `mo-610-122-arrest-expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-arrest-set::official-form:CR370` | `official-form:CR370` | MO | `held-inventory-reconciliation` | `mo-610-140-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-arrest-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-610-140-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-arrest-set::official-form:GN10` | `official-form:GN10` | MO | `held-inventory-reconciliation` | `mo-610-140-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-conviction-set::official-form:CR370` | `official-form:CR370` | MO | `held-inventory-reconciliation` | `mo-610-140-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-conviction-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-610-140-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-conviction-set::official-form:GN10` | `official-form:GN10` | MO | `held-inventory-reconciliation` | `mo-610-140-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-145-mistaken-identity-set::official-form:CR301` | `official-form:CR301` | MO | `held-inventory-reconciliation` | `mo-610-145-mistaken-identity-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-145-mistaken-identity-set::official-form:CR311` | `official-form:CR311` | MO | `held-inventory-reconciliation` | `mo-610-145-mistaken-identity-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-145-mistaken-identity-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-610-145-mistaken-identity-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-art-xiv-marijuana-set::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `mo-art-xiv-marijuana-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_145_5_felony-set::official-form:AOC-CR-297-INSTRUCTIONS` | `official-form:AOC-CR-297-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `nc_145_5_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_145_5_misdemeanor-set::official-form:AOC-CR-298-INSTRUCTIONS` | `official-form:AOC-CR-298-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `nc_145_5_misdemeanor-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_145_8a_youthful-set::official-form:AOC-CR-293` | `official-form:AOC-CR-293` | NC | `held-inventory-reconciliation` | `nc_145_8a_youthful-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_145_8a_youthful-set::official-form:AOC-CR-293-INSTRUCTIONS` | `official-form:AOC-CR-293-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `nc_145_8a_youthful-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_146_acquittal_petition-set::official-form:AOC-CR-288-INSTRUCTIONS` | `official-form:AOC-CR-288-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `nc_146_acquittal_petition-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_146_dismissal_petition-set::official-form:AOC-CR-287-INSTRUCTIONS` | `official-form:AOC-CR-287-INSTRUCTIONS` | NC | `held-inventory-reconciliation` | `nc_146_dismissal_petition-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `nc_auto_146_a4_agency_followup-set::official-form:AOC-G-260` | `official-form:AOC-G-260` | NC | `held-inventory-reconciliation` | `nc_auto_146_a4_agency_followup-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ne-seal-pardoned-set::official-form:CC-6-12a` | `official-form:CC-6-12a` | NE | `held-inventory-reconciliation` | `ne-seal-pardoned-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ne-seal-pre2017-set::official-form:CC-6-12a` | `official-form:CC-6-12a` | NE | `held-inventory-reconciliation` | `ne-seal-pre2017-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_decriminalized-set::official-form:DC-33-AFFIDAVIT` | `official-form:DC-33-AFFIDAVIT` | RI | `held-inventory-reconciliation` | `ri_decriminalized-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_decriminalized-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_decriminalized-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_deferred_sentence-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_deferred_sentence-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_first_offender_felony-set::official-form:Superior-55-ORDER` | `official-form:Superior-55-ORDER` | RI | `held-inventory-reconciliation` | `ri_first_offender_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_first_offender_misdemeanor-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_first_offender_misdemeanor-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_multiple_misdemeanors-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_multiple_misdemeanors-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Deterministically assert exactly the 48 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='SRC02');
if (!a || a.items.length !== 48) throw new Error('SRC02 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','SRC02',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC02 --source-obligation 'al-diversion-set::official-form:CR-65' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`al-diversion-set`, `al-felony-dwop-set`, `al-felony-nonconviction-90-set`, `al-misd-conviction-set`, `al-misd-dwop-set`, `al-misd-nonconviction-90-set`, `al-pardon-set`, `al-pardoned-felony-set`, `al-trafficking-set`, `co_municipal_conviction_seal-set`, `co_petition_seal_arrest-set`, `composed-treatment:nc_146_dismissal_petition`, `md_10105_early-set`, `md_10105_favorable-set`, `md_10110_conviction-set`, `md_cannabis_petition-set`, `md_pardon_expungement-set`, `mo-575-120-identity-theft-correction-set`, `mo-610-122-arrest-expungement-set`, `mo-610-140-arrest-set`, `mo-610-140-conviction-set`, `mo-art-xiv-marijuana-set`, `nc_145_5_felony-set`, `nc_145_5_misdemeanor-set`, `nc_145_8a_youthful-set`, `nc_146_acquittal_petition-set`, `nc_146_dismissal_petition-set`, `nc_auto_146_a4_agency_followup-set`, `ne-seal-pardoned-set`, `ne-seal-pre2017-set`, `ri_decriminalized-set`, `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| C-10-CRIMINAL | AL | 8 |
| FI-05 | MO | 6 |
| AOC-CV-226 | NC | 4 |
| DC-33 | RI | 4 |
| CC-DC-089 | MD | 3 |
| CC-6-12 | NE | 2 |
| ABPP-3 | AL | 1 |
| JDF-683 | CO | 1 |
| JDF-417 | CO | 1 |
| CC-DC-CR-072C | MD | 1 |
| CC-DC-CR-072A | MD | 1 |
| AOC-CR-288 | NC | 1 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src02/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src02/**`

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

- data/rcap-grade-a/packet-factory-24h/src02/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src02/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
