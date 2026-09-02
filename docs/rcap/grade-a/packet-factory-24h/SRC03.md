# SRC03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `0d08881e9bc4f41d9f4c03374ecc8e449f028b9c` (or the newer dispatch base)
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
  --minimum-captain-sha 0d08881e9bc4f41d9f4c03374ecc8e449f028b9c
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

- Assert each exact source obligation before reading evidence: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC03 <itemId>`
- The committed assignment contains exactly 22 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC03 <itemId>`.

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

**22 obligations · 16 families this lane WOULD release if every one of them resolves · hosts: AZ, CO, DE, KY, MA, MD**

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
| `co_municipal_conviction_seal-set::official-form:JDF-684` | `official-form:JDF-684` | CO | `held-inventory-reconciliation` | `co_municipal_conviction_seal-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_family_court-set::official-form:FORM-281` | `official-form:FORM-281` | DE | `held-inventory-reconciliation` | `de_discretionary_family_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_02_A` | `official-form:CIV_EXP_02_A` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_02_B` | `official-form:CIV_EXP_02_B` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_discretionary_superior_court-set::official-form:CIV_EXP_04_A` | `official-form:CIV_EXP_04_A` | DE | `held-inventory-reconciliation` | `de_discretionary_superior_court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_pardon_expungement-set::official-form:CIV_EXP_02_A` | `official-form:CIV_EXP_02_A` | DE | `held-inventory-reconciliation` | `de_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `de_pardon_expungement-set::official-form:CIV_EXP_08_A` | `official-form:CIV_EXP_08_A` | DE | `held-inventory-reconciliation` | `de_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ky_nonconviction_expungement-set::official-form:AOC-497.2` | `official-form:AOC-497.2` | KY | `held-inventory-reconciliation` | `ky_nonconviction_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ky_protective_order_record_expungement-set::official-form:AOC-275.18` | `official-form:AOC-275.18` | KY | `held-inventory-reconciliation` | `ky_protective_order_record_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `ma-seal-court-set::official-form:TC0057` | `official-form:TC0057` | MA | `held-inventory-reconciliation` | `ma-seal-court-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10105_early-set::official-form:CC-DC-CR-072C` | `official-form:CC-DC-CR-072C` | MD | `held-inventory-reconciliation` | `md_10105_early-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10105_favorable-set::official-form:CC-DC-CR-072A` | `official-form:CC-DC-CR-072A` | MD | `held-inventory-reconciliation` | `md_10105_favorable-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_10110_conviction-set::official-form:CC-DC-CR-072B` | `official-form:CC-DC-CR-072B` | MD | `held-inventory-reconciliation` | `md_10110_conviction-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_cannabis_petition-set::official-form:CC-DC-CR-072D` | `official-form:CC-DC-CR-072D` | MD | `held-inventory-reconciliation` | `md_cannabis_petition-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `md_pardon_expungement-set::official-form:CC-DC-CR-072B` | `official-form:CC-DC-CR-072B` | MD | `held-inventory-reconciliation` | `md_pardon_expungement-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Deterministically assert exactly the 22 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='SRC03');
if (!a || a.items.length !== 22) throw new Error('SRC03 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','SRC03',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC03 --source-obligation 'az_certificate_second_chance-set::official-form:AOCCRSA3F-010122' --codex-cloud --minimum-captain-sha 0d08881e9bc4f41d9f4c03374ecc8e449f028b9c

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`az_certificate_second_chance-set`, `az_marijuana_expungement_limited_jurisdiction-set`, `az_record_sealing_conviction-set`, `az_set_aside-set`, `co_municipal_conviction_seal-set`, `de_discretionary_family_court-set`, `de_discretionary_superior_court-set`, `de_pardon_expungement-set`, `ky_nonconviction_expungement-set`, `ky_protective_order_record_expungement-set`, `ma-seal-court-set`, `md_10105_early-set`, `md_10105_favorable-set`, `md_10110_conviction-set`, `md_cannabis_petition-set`, `md_pardon_expungement-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| CC-DC-089 | MD | 3 |
| CIV_EXP_02_A | DE | 2 |
| AOCCRSA3F-010122 | AZ | 1 |
| AOC-CREM2F-071221 | AZ | 1 |
| AOCCRSL1F-050825 | AZ | 1 |
| AOCCR41FORM31A-082224 | AZ | 1 |
| JDF-683 | CO | 1 |
| FORM-281 | DE | 1 |
| AOC-497 | KY | 1 |
| AOC-275.18 | KY | 1 |
| TC0057 | MA | 1 |
| CC-DC-CR-072C | MD | 1 |

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
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-summary-conviction-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-dismissed-without-prejudice-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-homicide-victim-prostitution-set*`
- `data/rcap-all50/overlays/census-v1/**/wv-conv-single-misdemeanor-set*`
- `data/rcap-all50/overlays/census-v1/**/ny-160-59-petition-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-limitations-set*`
- `data/rcap-all50/overlays/census-v1/**/ne-setaside-custodial-set*`
- `data/rcap-all50/overlays/census-v1/**/nj-arrest-no-conviction-set*`
- `data/rcap-all50/overlays/census-v1/**/oh-marijuana-expungement-set*`
- `data/rcap-all50/overlays/census-v1/**/nj-clean-slate-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-490-nonconviction-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-acquittal-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-cannabis-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-survivor-misdemeanor-set*`
- `data/rcap-all50/overlays/census-v1/**/ca-1203-4a-set*`

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
PREFLIGHT: SOURCE_CONVEYOR_PREFLIGHT_READY
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
