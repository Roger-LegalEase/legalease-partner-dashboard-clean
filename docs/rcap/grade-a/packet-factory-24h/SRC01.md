# SRC01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `37f129f76b6ecb5393c2acc0300051c507a289cf` (or the newer dispatch base)
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
  --assignment-id SRC01 \
  --source-obligation 'ca-diversion-seal-set::official-form:SDSC-CRM-307' \
  --codex-cloud \
  --minimum-captain-sha 37f129f76b6ecb5393c2acc0300051c507a289cf
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

- Assert each exact source obligation before reading evidence: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC01 <itemId>`
- The committed assignment contains exactly 58 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release SRC01 <itemId>`.

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

**58 obligations · 18 families this lane WOULD release if every one of them resolves · hosts: CA, KS, ME, NH, NM**

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
| `me-seal-gen-set::official-form:CR-218` | `official-form:CR-218` | ME | `held-inventory-reconciliation` | `me-seal-gen-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `me-seal-survivor-set::official-form:CR-308` | `official-form:CR-308` | ME | `held-inventory-reconciliation` | `me-seal-survivor-set` | named held-corpus identity or pinned SHA-256 | `PROMO` |
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
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-430` | `official-form:CR-430` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-431` | `official-form:CR-431` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-432` | `official-form:CR-432` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |
| `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b::official-form:CR-430-INFO` | `official-form:CR-430-INFO` | CA | `held-inventory-reconciliation` | `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b` | named held-corpus identity or pinned SHA-256 | `PROMO` |

Deterministically assert exactly the 58 committed itemIds (failures are recorded per row and do not terminate the loop):

```sh
node - <<'NODE'
const {spawnSync}=require('node:child_process');
const a=require('./data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='SRC01');
if (!a || a.items.length !== 58) throw new Error('SRC01 committed item count changed');
for (const itemId of a.items) {
  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','SRC01',itemId],{stdio:'inherit'});
  if (r.status !== 0) console.error('ROW_STOP', itemId);
}
NODE
```


Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id SRC01 --source-obligation 'ca-diversion-seal-set::official-form:SDSC-CRM-307' --codex-cloud --minimum-captain-sha 37f129f76b6ecb5393c2acc0300051c507a289cf

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`ca-diversion-seal-set`, `ks-21-6614-conviction-set`, `ks-21-6614-diversion-set`, `ks-21-6614-prostitution-coercion-set`, `ks-21-6614-specialty-court-set`, `ks-22-2410-arrest-set`, `ks-22-4908-registration-relief-set`, `me-seal-gen-set`, `me-seal-survivor-set`, `nh_conviction_standard-set`, `nh_conviction_streamlined-set`, `nh_marijuana_annulment-set`, `nh_petition_nonconviction_pre2019-set`, `nh_petition_vacated-set`, `nm_conviction-set`, `nm_identity_theft-set`, `nm_release_without_conviction-set`, `official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| KS-CRIMINAL-COVER-SHEET-10-14-2025 | KS | 5 |
| KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022 | KS | 5 |
| NHJB-2311 | NH | 5 |
| 4-222 | NM | 3 |
| SDSC-CRM-307 | CA | 1 |
| CR-218 | ME | 1 |
| CR-307 | ME | 1 |
| CR-106 | CA | 1 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

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
PREFLIGHT: SOURCE_CONVEYOR_PREFLIGHT_READY
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
