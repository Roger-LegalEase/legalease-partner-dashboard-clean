# SOURCE_3_CONTENT_HASH_CURRENTNESS

**Engine:** Codex  ·  **Lane:** source-identity-acquisition-promotion  ·  **Sequence:** 2
**Worker branch:** `codex/source-03-content-hash-currentness`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Reconcile every pinned content hash the corpus cannot produce. Either the revision moved or the pin was wrong, and those two have different remedies.

## What bounds this lane

the issuing host for each pinned content hash that no longer resolves

These are the obligations standing between the 6 families in this class and tomorrow's build queue. Clearing one releases the families that name it; clearing none holds the build lanes at today's ceiling.

**14 obligations · 6 families released if all clear · hosts: GA, MT, VA, WV**

Absence classes: named_content_hash_not_in_corpus.

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Families this lane releases

`ga-fo-active-pre2026-set`, `ga-fo-discharged-pre2026-set`, `mt_mmrta_completed-set`, `mt_mmrta_serving-set`, `va_exp_identity_used_by_another-set`, `wv_acc_treatment_job_readiness-set`

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/source-03-content-hash-currentness/**`
- `data/rcap-grade-a/source-acquisition/mass-production/source-03-content-hash-currentness/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/mass-production/source-03-content-hash-currentness/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/mass-production/source-03-content-hash-currentness/receipts.json — for anything resolved, the exact form number or SHA-256 and where it was found; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from, never a near-match promoted to an identity.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/source-03-content-hash-currentness 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-source-03-content-hash-currentness.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/source-03-content-hash-currentness`.
