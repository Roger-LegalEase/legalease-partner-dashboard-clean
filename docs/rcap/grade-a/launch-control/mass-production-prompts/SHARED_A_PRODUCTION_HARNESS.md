# SHARED_A_PRODUCTION_HARNESS

**Engine:** Codex  ·  **Lane:** shared-infrastructure  ·  **Sequence:** 1
**Worker branch:** `codex/shared-a-production-harness`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Build the shared production harness every packet builder calls, so twelve lanes do not each invent a completeness report. You render no packet family and you change no completeness contract: you give the builders one way to prove what they built.

## What you build

- `scripts/rcap-packet-production/completeness-report.mjs`
- `scripts/rcap-packet-production/visible-write-proof.mjs`
- `scripts/rcap-packet-production/blank-disposition-ledger.mjs`
- `scripts/rcap-packet-production/filing-instruction-assembler.mjs`
- `scripts/rcap-packet-production/companion-document-check.mjs`

**Read-only dependencies — you call these and do not change them:**

- `scripts/rcap-packet-completeness/completeness-contract.mjs`
- `scripts/rcap-packet-completeness/verify-packet-completeness.mjs`

## Owned paths — write only here

- `scripts/rcap-packet-production/**`
- `data/rcap-grade-a/mass-production/shared-a/**`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- scripts/rcap-packet-production/completeness-report.mjs — emits the nine counters per document and per family, reading its vocabulary from the existing completeness contract rather than restating it
- scripts/rcap-packet-production/visible-write-proof.mjs — locates every write on the page it renders on, so an invisible write cannot pass as a written field
- scripts/rcap-packet-production/blank-disposition-ledger.mjs — one row per blank, carrying an approved disposition from the closed vocabulary
- scripts/rcap-packet-production/filing-instruction-assembler.mjs — assembles destination, fee, service and ordering from the route record, refusing to emit an instruction the route does not support
- scripts/rcap-packet-production/companion-document-check.mjs — every component the route names is rendered, so a document mapped into the packet cannot be silently skipped
- data/rcap-grade-a/mass-production/shared-a/rows.json — one row per module: itemId, status, what it proves, and the mutation that shows it is not vacuous
- data/rcap-grade-a/mass-production/shared-a/mutations.json — every module carries mutation tests; a module with no failing mutation proves nothing

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

Detail goes in separate fields. An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --mutations`
- `npm run typecheck`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you do not change scripts/rcap-packet-completeness/**. The completeness contract is fixed; you read it.
- LANE STOP — you render no packet and you write into no overlay directory.
- ROW STOP — a module you cannot make non-vacuous is a STOPPED row carrying the mutation that should have failed and did not.

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
COMPLETENESS CONTRACT CHANGED: NO
PACKETS RENDERED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A harness proves nothing about any packet. It gives builders one way to state what they built.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/shared-a-production-harness 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-shared-a-production-harness.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
```

Commit your work and `git push -u origin codex/shared-a-production-harness`.
