# DISC05

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `aefd46f7cf0925a1b71151c9e8ec14732c8e560f` (or the newer dispatch base)
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
  --codex-cloud \
  --minimum-captain-sha aefd46f7cf0925a1b71151c9e8ec14732c8e560f
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
- The committed assignment contains exactly 0 itemIds; iterate those values only. A familyId is metadata and is not a source claim key.
- A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.
- Release each completed obligation independently: `node scripts/grade-a-packet-factory-24h/claim.mjs --release DISC05 <itemId>`.

## Read the source relationship registry first

`data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json` — Look your obligation up by jurisdiction and canonical artifact id. Its sourceState tells you whether there is anything to fetch at all.

**These states are NOT a fetch. Acting on them as one is the defect this registry exists to stop.**

- `BUNDLE_COMPONENT` — 0 — the document is a page inside a public bundle whose address is already recorded. Record the component locator and alias. Acquire the BUNDLE once, never the page.
- `EMBEDDED_SECTION` — 0 — the document is a section inside another form. There is no separate binary to request from anyone.
- `STALE_OR_VARIANT_ID` — 0 — the identity is missing its current suffix or its filing-mode variant. Normalize the identity first; the form is public.
- `SOURCE_SCOPE_AND_VERSION_AMBIGUITY` — 0 — statewide versus local scope is unsettled. Settle the scope before any inquiry.
- `FAMILY_IDENTITY_AMBIGUOUS` — 2 — several held artifacts match this identity. Which one the route requires is the question; do not pick one.
- `CURRENTNESS_UNVERIFIED` — 4 — the corpus already HOLDS matching bytes. The open question is whether the publisher still issues that edition. This is not a missing source and it is not an acquisition.
- `STATUTORY_CUSTOM_PLEADING` — 0 — a statutory citation. There is no document at the other end; a packet-build lane drafts against the statute.
- `LICENSE_PERMISSION_REVIEW` — 0 — the form is public and its publisher restricts commercial reuse. Counsel and business decide, not a clerk.

**These are:**

- `STANDALONE_ARTIFACT` — 0 — public, ordinary acquisition.
- `PUBLIC_DOWNLOAD` — 0 — public, ordinary acquisition.
- `MISSING_SOURCE_BINARY` — 0 — expected and absent; acquire once an exact address is settled.
- `MISSING_CANONICAL_RELATIONSHIP_METADATA` — 20 — no publisher, address or locator is recorded. Settle identity before fetching.

**The previous human queue told a person to contact a clerk 101 times. Zero of the top twenty justified it. If the registry records an official source page, the answer is already known.**

A publisher's commercial-reuse restriction is a counsel and business decision. Record it; do not resolve it and do not ask a clerk about it.

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number. No obligation of this class is queued for this host group at dispatch; the lane starts the moment one arrives.

## What bounds this lane

the issuing court or agency that publishes the document

**0 obligations · 0 families this lane WOULD release if every one of them resolves · hosts: —**

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
| _No current obligations_ | — | — | `exact-source-identity` | — | Lane remains queued; do not invent an input. | — |
**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release



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
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`
- `data/rcap-all50/overlays/census-v1/**/ny-160-59-petition-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-490-nonconviction-set*`
- `data/rcap-all50/overlays/census-v1/**/nj-indictable-conviction-set*`

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
