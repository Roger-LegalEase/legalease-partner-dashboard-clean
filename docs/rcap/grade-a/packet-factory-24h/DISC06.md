# DISC06

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `d401900ef6727d2ca60730d0adc7d8525c1a2de5` (or the newer dispatch base)
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
  --assignment-id DISC06 \
  --source-obligation 'fl-10yr-bridge-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION' \
  --codex-cloud \
  --minimum-captain-sha d401900ef6727d2ca60730d0adc7d8525c1a2de5
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

- Assert each exact source obligation before reading evidence: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert DISC06 <itemId>`
- The committed assignment contains exactly 18 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release DISC06 <itemId>`.

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

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**18 obligations · 10 families this lane WOULD release if every one of them resolves · hosts: FL, MA, MI, ND**

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
| `fl-10yr-bridge-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-10yr-bridge-set` | unresolved exact identity or URL | `ACQ` |
| `fl-administrative-set::official-form:FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION` | `official-form:FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-administrative-set` | unresolved exact identity or URL | `ACQ` |
| `fl-early-juvenile-set::official-form:FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION` | `official-form:FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-early-juvenile-set` | unresolved exact identity or URL | `ACQ` |
| `fl-expunction-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-expunction-set` | unresolved exact identity or URL | `ACQ` |
| `fl-juvenile-diversion-set::official-form:FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION` | `official-form:FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-juvenile-diversion-set` | unresolved exact identity or URL | `ACQ` |
| `fl-sealing-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-sealing-set` | unresolved exact identity or URL | `ACQ` |
| `ma-expunge-k-set::official-form:Petition for Expungement, G.L. c. 276, § 100K` | `official-form:Petition for Expungement, G.L. c. 276, § 100K` | MA | `exact-source-identity` | `ma-expunge-k-set` | unresolved exact identity or URL | `ACQ` |
| `ma-seal-admin-set::official-form:Petition to Seal (Office of the Commissioner of Probation)` | `official-form:Petition to Seal (Office of the Commissioner of Probation)` | MA | `exact-source-identity` | `ma-seal-admin-set` | unresolved exact identity or URL | `ACQ` |
| `ma-seal-decrim-set::official-form:Petition to Seal (Office of the Commissioner of Probation), Part A box 4` | `official-form:Petition to Seal (Office of the Commissioner of Probation), Part A box 4` | MA | `exact-source-identity` | `ma-seal-decrim-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_application-set::official-form:MC 227` | `official-form:MC 227` | MI | `exact-source-identity` | `mi_setaside_application-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_application-set::official-form:MC 227 page 3 Proof of Service` | `official-form:MC 227 page 3 Proof of Service` | MI | `exact-source-identity` | `mi_setaside_application-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_first_owi-set::official-form:MC 227 item 2.c` | `official-form:MC 227 item 2.c` | MI | `exact-source-identity` | `mi_setaside_first_owi-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_first_owi-set::official-form:MC 227 page 3 Proof of Service` | `official-form:MC 227 page 3 Proof of Service` | MI | `exact-source-identity` | `mi_setaside_first_owi-set` | unresolved exact identity or URL | `ACQ` |
| `mi_setaside_trafficking-set::official-form:Proof of Service` | `official-form:Proof of Service` | MI | `exact-source-identity` | `mi_setaside_trafficking-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-BRIEF-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-BRIEF-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-DECLARATION-OF-SERVICE` | `official-form:ND-DECLARATION-OF-SERVICE` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-MOTION-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-MOTION-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |
| `nd-prohibit-remote-public-access-set::official-form:ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS` | `official-form:ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS` | ND | `exact-source-identity` | `nd-prohibit-remote-public-access-set` | unresolved exact identity or URL | `ACQ` |

Deterministically assert exactly the 18 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='DISC06');
if (!a || a.items.length !== 18) throw new Error('DISC06 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','DISC06',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC06 --source-obligation 'fl-10yr-bridge-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION' --codex-cloud --minimum-captain-sha d401900ef6727d2ca60730d0adc7d8525c1a2de5

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`fl-administrative-set`, `fl-early-juvenile-set`, `fl-juvenile-diversion-set`, `ma-expunge-k-set`, `ma-seal-admin-set`, `ma-seal-decrim-set`, `mi_setaside_application-set`, `mi_setaside_first_owi-set`, `mi_setaside_trafficking-set`, `nd-prohibit-remote-public-access-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| FL-RULE-3.989-ORDER | FL | 4 |
| MC 227 page 3 Proof of Service | MI | 2 |
| FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION | FL | 1 |
| FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION | FL | 1 |
| FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION | FL | 1 |
| Petition for Expungement, G.L. c. 276, § 100K | MA | 1 |
| Petition to Seal (Office of the Commissioner of Probation) | MA | 1 |
| Petition to Seal (Office of the Commissioner of Probation), Part A box 4 | MA | 1 |
| MC 227b | MI | 1 |
| ND-BRIEF-PROHIBIT-PUBLIC-ACCESS | ND | 1 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc06/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc06/**`

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

- data/rcap-grade-a/packet-factory-24h/disc06/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc06/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
