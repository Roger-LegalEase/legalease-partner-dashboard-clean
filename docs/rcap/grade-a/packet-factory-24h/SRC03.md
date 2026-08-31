# SRC03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-identity-acquisition-promotion
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `40ccc028a2af8eac94743cdb32237e3af56a6642` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family ga-fo-active-pre2026-set::source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5 \
  --codex-cloud \
  --minimum-captain-sha 40ccc028a2af8eac94743cdb32237e3af56a6642
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**. A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Mission

Reconcile every pinned content hash the corpus cannot produce. Either the revision moved or the pin was wrong, and those have different remedies.

## What bounds this lane

the issuing host for each pinned content hash that no longer resolves

**15 obligations · 7 families released if all clear · hosts: GA, MT, SC, VA, WV**

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Every acquired or promoted source records

- official publisher
- exact title
- form number
- revision
- official URL
- MIME type
- page count
- technology (acroform, xfa, flat)
- SHA-256
- byte size
- custody path

**As soon as a family becomes source-ready, report it in the checkpoint. Captain assigns it to the next available PF lane without waiting for this lane to finish.**

### Families this lane releases

`ga-fo-active-pre2026-set`, `ga-fo-discharged-pre2026-set`, `mt_mmrta_completed-set`, `mt_mmrta_serving-set`, `rcap-sc-custom-pleading`, `va_exp_identity_used_by_another-set`, `wv_acc_treatment_job_readiness-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/src03/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/src03/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
- `data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8-completeness-repair-priority-four/**`
- `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/**`
- `scripts/build-census-v1-sd_arrest_expungement-set.mjs`
- `data/rcap-grade-a/codex-cloud/sd-arrest-expungement-disclosure-repair/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-01/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-02/**`
- `data/rcap-grade-a/codex-cloud/s2-continuation-verify-03/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/src03/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/src03/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
