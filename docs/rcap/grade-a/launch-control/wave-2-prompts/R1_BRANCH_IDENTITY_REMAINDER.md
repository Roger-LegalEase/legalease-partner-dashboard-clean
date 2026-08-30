# R1_BRANCH_IDENTITY_REMAINDER

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r1-branch-identity-remainder`
**Branch from:** `ebb99d663f857f58a173c1d29eb73d0f15e70cbd`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Finish the 14 participant branch identities the first wave stopped on. Each one has a named blocker recorded by the lane that stopped it; none is starting from nothing.

## Your exact scope — 14 routeKeys

- `obligation:track-only:CT:ct-nonconviction-auto`
- `obligation:track-pathway:CT:ct-diversion:automatic-non-conviction-erasure-under-conn-gen-stat-54-142a`
- `obligation:track-only:KY:ky_diversion_disposition_routing`
- `obligation:track-only:MD:md_10112_dpscs_cannabis`
- `obligation:track-only:MI:mi_auto_misd92`
- `obligation:track-only:MI:mi_auto_misd93`
- `obligation:track-only:MI:mi_deferral_status`
- `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g`
- `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing`
- `obligation:track-only:NY:ny_clean_slate_dwai`
- `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57`
- `obligation:track-only:VA:va_auto_seal_without_order`
- `obligation:track-only:VT:vt_diversion_post_charge`
- `obligation:track-only:WV:wv_dui_test_and_lock_dismissal`

## Reuse decision

**RESUME_FROM_RESIDUAL_RECORD** — Every item here is open in data/rcap-grade-a/launch-control/RESIDUAL_WORK.json, which refuses to carry anything the integration status reports completed.

## Required inputs

- `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json  (read from the Captain branch tip, not from the baseline)`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/RESIDUAL_WORK.json`
- `data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/r1-branch-identity-remainder/**`

## Prohibited paths — never write here

- `data/rcap-grade-a/launch-control/**`
- `docs/rcap/grade-a/launch-control/**`
- `data/record-clearing/legal-decisions/**`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/route-obligation-census-candidate/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/wave-2/r1-branch-identity-remainder/rows.json — one row per route: itemId, status, the participant A branch route key or keys, selector, output strategy, product outcome, commercial treatment, and for a stop the exact blocker

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/generate-category-b-integration-status.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ROW STOP — a route whose participant instrument names no document identifiable from a committed record. Naming a form you have not seen sends a participant to file the wrong thing.
- ROW STOP — a crosswalk you cannot confirm. Reporting one that does not hold silently drops a branch nothing else covers.
- LANE STOP — a change that would move the census denominator. The denominator moves only through the national census generator, with an explanation.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
ROUTES COMPLETED:
ROUTES STOPPED:
BRANCH IDENTITIES CREATED:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r1-branch-identity-remainder ebb99d663f857f58a173c1d29eb73d0f15e70cbd
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === ebb99d663f857f58a173c1d29eb73d0f15e70cbd
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r1-branch-identity-remainder`.
