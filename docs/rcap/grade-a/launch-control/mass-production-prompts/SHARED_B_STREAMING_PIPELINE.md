# SHARED_B_STREAMING_PIPELINE

**Engine:** Codex  ·  **Lane:** shared-infrastructure  ·  **Sequence:** 1
**Worker branch:** `codex/shared-b-streaming-pipeline`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Build the pipeline that makes verification streaming rather than batched: a claim ledger so six verifiers never verify the same family, a four-verdict recorder, an automatic repair-assignment emitter, and the exact-hash packager that cuts review batches of twenty-five as families pass.

## What you build

- `scripts/rcap-mass-production-pipeline/claim-ledger.mjs`
- `scripts/rcap-mass-production-pipeline/record-verdict.mjs`
- `scripts/rcap-mass-production-pipeline/emit-repair-assignment.mjs`
- `scripts/rcap-mass-production-pipeline/cut-review-batch.mjs`
- `scripts/rcap-mass-production-pipeline/production-checkpoint.mjs`

## Owned paths — write only here

- `scripts/rcap-mass-production-pipeline/**`
- `data/rcap-grade-a/mass-production/shared-b/**`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `scripts/rcap-packet-production/**`
- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- scripts/rcap-mass-production-pipeline/claim-ledger.mjs — a verifier claims a returned family atomically; a second claim on a claimed family is refused, not queued
- scripts/rcap-mass-production-pipeline/record-verdict.mjs — records exactly one of PASS_COMPLETE_INDEPENDENT, FAIL_REPAIR_REQUIRED, BLOCKED_SOURCE, BLOCKED_LEGAL_INPUT; an unrecognised verdict is refused rather than translated
- scripts/rcap-mass-production-pipeline/emit-repair-assignment.mjs — every FAIL_REPAIR_REQUIRED emits a targeted repair assignment naming the decisive defect, the owning build lane and the shard that re-verifies it
- scripts/rcap-mass-production-pipeline/cut-review-batch.mjs — cuts a 25-family review package from passing families only, with exact hashes for every artifact and every source
- scripts/rcap-mass-production-pipeline/production-checkpoint.mjs — the four-hour checkpoint, every count read from a file rather than typed
- data/rcap-grade-a/mass-production/shared-b/rows.json — one row per module with the mutation that proves it is not vacuous

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

Detail goes in separate fields. An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you render no packet, verify no packet and approve no packet. You build the mechanism the verifiers use.
- LANE STOP — you write no launch-control manifest. Captain publishes those.
- NEVER let a claim be advisory. A claim two verifiers can both hold is not a claim, and duplicate verification is how a fleet reports more proof than it has.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
MODULES COMPLETED:
MODULES STOPPED:
MUTATIONS WRITTEN:
MUTATIONS CAUGHT:
DOUBLE-CLAIM REFUSED IN TEST: YES/NO
PACKETS VERIFIED BY THIS LANE: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A pipeline moves verdicts. It does not produce one, and it opens no route.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/shared-b-streaming-pipeline 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-shared-b-streaming-pipeline.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
```

Commit your work and `git push -u origin codex/shared-b-streaming-pipeline`.
