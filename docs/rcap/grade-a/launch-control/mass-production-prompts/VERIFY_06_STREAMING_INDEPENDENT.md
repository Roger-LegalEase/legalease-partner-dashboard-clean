# VERIFY_06_STREAMING_INDEPENDENT

**Engine:** Codex  ·  **Lane:** independent-verification  ·  **Sequence:** 3
**Worker branch:** `codex/verify-06-mass-production`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Verify returned packet families independently, as they return. You do not wait for a wave: you claim the next unclaimed returned family and verify it. Declared capacity 20 to 30 families a day.

**Runs after:** SHARED_B_STREAMING_PIPELINE. Do not start until that lane's work is integrated onto your base.

## How work reaches you

A static list is a batch. Verification here is streaming: families arrive as builders return them, and a fixed list would idle five verifiers while the sixth waits for its named family.

- **Claim ledger:** `data/rcap-grade-a/mass-production/claim-ledger.json`
- **Rule:** Claim atomically before reading. A family already claimed is skipped, never queued behind: two verifiers on one family is duplicate work reported as independent proof.
- **Mechanism:** scripts/rcap-mass-production-pipeline/claim-ledger.mjs, delivered by SHARED_B_STREAMING_PIPELINE
- **Daily capacity:** 20–30 families

## Verdicts

- PASS_COMPLETE_INDEPENDENT
- FAIL_REPAIR_REQUIRED
- BLOCKED_SOURCE
- BLOCKED_LEGAL_INPUT

Exactly one of PASS_COMPLETE_INDEPENDENT, FAIL_REPAIR_REQUIRED, BLOCKED_SOURCE, BLOCKED_LEGAL_INPUT per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read out of the builder's report.

**You did not build these families and you may not repair them. A defect you can see is a verdict and a repair assignment, never an edit.**

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/verify-06-mass-production/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`
- `scripts/rcap-packet-production/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/mass-production/verify-06-mass-production/rows.json — one row per family claimed: itemId, verdict, the decisive obligation and the evidence read
- data/rcap-grade-a/mass-production/verify-06-mass-production/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect, the owning build lane and the shard that re-verifies it

### Output schema

Array key `rows`, item key `itemId`, status words: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

An unrecognised verdict is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you write into no overlay directory and no build script. Verification that edits what it verifies is not verification.
- LANE STOP — you claim before you read. An unclaimed read is how the same family gets counted twice.
- ROW STOP — a family blocked by its source is BLOCKED_SOURCE and a family blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
FAMILIES CLAIMED:
PASS_COMPLETE_INDEPENDENT:
FAIL_REPAIR_REQUIRED:
BLOCKED_SOURCE:
BLOCKED_LEGAL_INPUT:
REPAIR ASSIGNMENTS EMITTED:
OVERLAY DIRECTORIES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

An independent PASS proves a packet is complete. It does not approve output and it opens no commercial route.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/verify-06-mass-production 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-verify-06-mass-production.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
```

Commit your work and `git push -u origin codex/verify-06-mass-production`.
