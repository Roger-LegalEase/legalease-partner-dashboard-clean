# SRC02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `ab3443e42730e0b45ce2e280b1f41ebfa42c2b29` (or the newer dispatch base)
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
  --minimum-captain-sha ab3443e42730e0b45ce2e280b1f41ebfa42c2b29
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
- The committed assignment contains exactly 49 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC02 <itemId>`.

## Read the source relationship registry first

`data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json` — Look your obligation up by jurisdiction and canonical artifact id. Its sourceState tells you whether there is anything to fetch at all.

**These states are NOT a fetch. Acting on them as one is the defect this registry exists to stop.**

- `BUNDLE_COMPONENT` — 3 — the document is a page inside a public bundle whose address is already recorded. Record the component locator and alias. Acquire the BUNDLE once, never the page.
- `EMBEDDED_SECTION` — 3 — the document is a section inside another form. There is no separate binary to request from anyone.
- `STALE_OR_VARIANT_ID` — 2 — the identity is missing its current suffix or its filing-mode variant. Normalize the identity first; the form is public.
- `SOURCE_SCOPE_AND_VERSION_AMBIGUITY` — 1 — statewide versus local scope is unsettled. Settle the scope before any inquiry.
- `FAMILY_IDENTITY_AMBIGUOUS` — 7 — several held artifacts match this identity. Which one the route requires is the question; do not pick one.
- `CURRENTNESS_UNVERIFIED` — 60 — the corpus already HOLDS matching bytes. The open question is whether the publisher still issues that edition. This is not a missing source and it is not an acquisition.
- `STATUTORY_CUSTOM_PLEADING` — 6 — a statutory citation. There is no document at the other end; a packet-build lane drafts against the statute.
- `LICENSE_PERMISSION_REVIEW` — 2 — the form is public and its publisher restricts commercial reuse. Counsel and business decide, not a clerk.

**These are:**

- `STANDALONE_ARTIFACT` — 8 — public, ordinary acquisition.
- `PUBLIC_DOWNLOAD` — 0 — public, ordinary acquisition.
- `MISSING_SOURCE_BINARY` — 3 — expected and absent; acquire once an exact address is settled.
- `MISSING_CANONICAL_RELATIONSHIP_METADATA` — 142 — no publisher, address or locator is recorded. Settle identity before fetching.

**The previous human queue told a person to contact a clerk 101 times. Zero of the top twenty justified it. If the registry records an official source page, the answer is already known.**

A publisher's commercial-reuse restriction is a counsel and business decision. Record it; do not resolve it and do not ask a clerk about it.

## Mission

Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.

## What bounds this lane

the private corpus and the committed inventory, read only — nothing is fetched here

**49 obligations · 20 families this lane WOULD release if every one of them resolves · hosts: AL, FL, ID, IN, MO, RI, UT, WV**

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
| `fl-10yr-bridge-set::official-form:FL-RULE-3.989-ORDER` | `official-form:FL-RULE-3.989-ORDER` | FL | `held-inventory-reconciliation` | `fl-10yr-bridge-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-10yr-bridge-set::official-form:FL-RULE-3.989-PETITION` | `official-form:FL-RULE-3.989-PETITION` | FL | `held-inventory-reconciliation` | `fl-10yr-bridge-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-expunction-set::official-form:FL-RULE-3.989-ORDER` | `official-form:FL-RULE-3.989-ORDER` | FL | `held-inventory-reconciliation` | `fl-expunction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-expunction-set::official-form:FL-RULE-3.989-PETITION` | `official-form:FL-RULE-3.989-PETITION` | FL | `held-inventory-reconciliation` | `fl-expunction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-expunction-set::official-form:FL-RULE-3.989-SWORN-STATEMENT` | `official-form:FL-RULE-3.989-SWORN-STATEMENT` | FL | `held-inventory-reconciliation` | `fl-expunction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-sealing-set::official-form:FL-RULE-3.989-ORDER` | `official-form:FL-RULE-3.989-ORDER` | FL | `held-inventory-reconciliation` | `fl-sealing-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-sealing-set::official-form:FL-RULE-3.989-PETITION` | `official-form:FL-RULE-3.989-PETITION` | FL | `held-inventory-reconciliation` | `fl-sealing-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-sealing-set::official-form:FL-RULE-3.989-SWORN-STATEMENT` | `official-form:FL-RULE-3.989-SWORN-STATEMENT` | FL | `held-inventory-reconciliation` | `fl-sealing-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-trafficking-set::official-form:FL-RULE-3.989-ORDER` | `official-form:FL-RULE-3.989-ORDER` | FL | `held-inventory-reconciliation` | `fl-trafficking-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-trafficking-set::official-form:FL-RULE-3.989-PETITION` | `official-form:FL-RULE-3.989-PETITION` | FL | `held-inventory-reconciliation` | `fl-trafficking-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `fl-trafficking-set::official-form:FL-RULE-3.9895-SWORN-STATEMENT` | `official-form:FL-RULE-3.9895-SWORN-STATEMENT` | FL | `held-inventory-reconciliation` | `fl-trafficking-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `id_clean_slate_shield-set::official-form:ISC-PETITION-TO-SHIELD-67-3004-11` | `official-form:ISC-PETITION-TO-SHIELD-67-3004-11` | ID | `held-inventory-reconciliation` | `id_clean_slate_shield-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `in_arrest_no_charges-set::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `in_arrest_no_charges-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `in_conviction_d6-set::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `in_conviction_d6-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `in_conviction_felony-set::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `in_conviction_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `in_conviction_misd-set::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `in_conviction_misd-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `in_section1_petition-set::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `in_section1_petition-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-575-120-identity-theft-correction-set::official-form:CR310` | `official-form:CR310` | MO | `held-inventory-reconciliation` | `mo-575-120-identity-theft-correction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-122-arrest-expungement-set::official-form:CR143` | `official-form:CR143` | MO | `held-inventory-reconciliation` | `mo-610-122-arrest-expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-arrest-set::official-form:CR370` | `official-form:CR370` | MO | `held-inventory-reconciliation` | `mo-610-140-arrest-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-140-conviction-set::official-form:CR370` | `official-form:CR370` | MO | `held-inventory-reconciliation` | `mo-610-140-conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-145-mistaken-identity-set::official-form:CR301` | `official-form:CR301` | MO | `held-inventory-reconciliation` | `mo-610-145-mistaken-identity-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `mo-610-145-mistaken-identity-set::official-form:CR311` | `official-form:CR311` | MO | `held-inventory-reconciliation` | `mo-610-145-mistaken-identity-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `rcap-in-custom-pleading::official-form:CCA-GF-0120-3016` | `official-form:CCA-GF-0120-3016` | IN | `held-inventory-reconciliation` | `rcap-in-custom-pleading` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `rcap-mo-custom-pleading::official-form:FI-05` | `official-form:FI-05` | MO | `held-inventory-reconciliation` | `rcap-mo-custom-pleading` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `rcap-mo-custom-pleading::official-form:GN10` | `official-form:GN10` | MO | `held-inventory-reconciliation` | `rcap-mo-custom-pleading` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_decriminalized-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_decriminalized-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_deferred_sentence-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_deferred_sentence-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_first_offender_felony-set::official-form:Superior-55-ORDER` | `official-form:Superior-55-ORDER` | RI | `held-inventory-reconciliation` | `ri_first_offender_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_first_offender_misdemeanor-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_first_offender_misdemeanor-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ri_multiple_misdemeanors-set::official-form:DC-33-ORDER` | `official-form:DC-33-ORDER` | RI | `held-inventory-reconciliation` | `ri_multiple_misdemeanors-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_cannabis-set::official-form:1023EX` | `official-form:1023EX` | UT | `held-inventory-reconciliation` | `ut_pet_cannabis-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_remove_link-set::official-form:1501CR` | `official-form:1501CR` | UT | `held-inventory-reconciliation` | `ut_pet_remove_link-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_remove_link-set::official-form:1501CR-C` | `official-form:1501CR-C` | UT | `held-inventory-reconciliation` | `ut_pet_remove_link-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_remove_link-set::official-form:1502CR` | `official-form:1502CR` | UT | `held-inventory-reconciliation` | `ut_pet_remove_link-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_special_certificate-set::official-form:1001EX` | `official-form:1001EX` | UT | `held-inventory-reconciliation` | `ut_pet_special_certificate-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ut_pet_special_certificate-set::official-form:1021EX` | `official-form:1021EX` | UT | `held-inventory-reconciliation` | `ut_pet_special_certificate-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_acc_treatment_job_readiness-set::official-form:SCA-C907` | `official-form:SCA-C907` | WV | `held-inventory-reconciliation` | `wv_acc_treatment_job_readiness-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_acc_treatment_job_readiness-set::source-sha256:2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222` | `source-sha256:2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222` | WV | `held-inventory-reconciliation` | `wv_acc_treatment_job_readiness-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `wv_conv_nonviolent_felony-set::official-form:SCA-C907` | `official-form:SCA-C907` | WV | `held-inventory-reconciliation` | `wv_conv_nonviolent_felony-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Deterministically assert exactly the 49 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='SRC02');
if (!a || a.items.length !== 49) throw new Error('SRC02 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','SRC02',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC02 --source-obligation 'al-diversion-set::official-form:CR-65' --codex-cloud --minimum-captain-sha ab3443e42730e0b45ce2e280b1f41ebfa42c2b29

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`al-diversion-set`, `al-felony-dwop-set`, `al-felony-nonconviction-90-set`, `al-misd-conviction-set`, `al-misd-dwop-set`, `al-misd-nonconviction-90-set`, `al-pardon-set`, `al-pardoned-felony-set`, `al-trafficking-set`, `fl-trafficking-set`, `id_clean_slate_shield-set`, `rcap-mo-custom-pleading`, `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`, `ut_pet_cannabis-set`, `ut_pet_special_certificate-set`, `wv_acc_treatment_job_readiness-set`, `wv_conv_nonviolent_felony-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| C-10-CRIMINAL | AL | 8 |
| FI-05 | MO | 7 |
| CCA-GF-0120-3016 | IN | 6 |
| FL-RULE-3.989-ORDER | FL | 4 |
| DC-33 | RI | 4 |
| 1044XX | UT | 2 |
| SCA-C907 | WV | 2 |
| ABPP-3 | AL | 1 |
| ISC-PETITION-TO-SHIELD-67-3004-11 | ID | 1 |
| Superior-55 | RI | 1 |
| 1110GE or 1111GE | UT | 1 |

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
