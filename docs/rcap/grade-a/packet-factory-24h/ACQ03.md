# ACQ03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER ACQ PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id ACQ03 \
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

- Assert every family before reading or writing anything: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert ACQ03 <familyId>`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Release each family when it is finished: `node scripts/grade-a-packet-factory-24h/claim.mjs --release ACQ03 <familyId>`, and leave that in your diff.

## How to raster

- Page rasters go through `scripts/lib/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Prepare the committed manifest row for one already-approved exact official URL. GitHub Actions performs acquisition; this no-egress agent does not dispatch or claim a workflow run. No obligation of this class is queued for this host group at dispatch; the lane starts the moment one arrives.

## What bounds this lane

one issuing host per lane, so a host that rate-limits blocks only its own lane

**0 obligations · 0 families this lane WOULD release if every one of them resolves · hosts: —**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Required operation record schema

- itemId
- sourceId
- jurisdiction
- issuingAuthority
- officialUrl
- urlKind
- expectedSha256
- title/formNumber
- manifestEntryId
- familyIds
- dispatchStatus
- handoffState

### Exact obligation rows

| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| _No current obligations_ | — | — | `official-acquisition-dispatch` | — | Lane remains queued; do not invent an input. | — |
**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release



## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/acq03/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/acq03/**`

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

- data/rcap-grade-a/packet-factory-24h/acq03/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/acq03/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
