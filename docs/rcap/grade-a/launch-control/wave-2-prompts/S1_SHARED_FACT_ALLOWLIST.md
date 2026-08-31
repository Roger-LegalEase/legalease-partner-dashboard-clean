# S1_SHARED_FACT_ALLOWLIST

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/s1-shared-fact-allowlist`
**Branch from:** `c8d912d9a1dea54043f6dbc2cda464d00946c74c`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Correct the shared fact allowlist that produced the completeness defect, once, in the two runner modules that carry it. runWestFamilyCli serves 9 families and runEastFamily serves 15; between them they decide what every official-PDF family is allowed to write. This lane changes the allowlist and nothing else — it renders no packet and repairs no family.

## Your exact scope — 2 sharedModules

- `scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`
- `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs`

## Reuse decision

**REPAIR_IN_PLACE_DO_NOT_REBUILD** — These four families are built and their artifacts are byte-checked. What is missing is content, not construction: the repair writes the facts the build owed and re-renders.

## Required inputs

- `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json  (read from the Captain branch tip, not from the baseline)`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/RESIDUAL_WORK.json`
- `data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/s1-shared-fact-allowlist/**`
- `scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`
- `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs`

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

- data/rcap-grade-a/wave-2/s1-shared-fact-allowlist/rows.json — one row per runner: itemId, status, every refusal reason removed or replaced, and the field classes each now writes
- scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs — the corrected allowlist, so a known participant or case fact is written rather than refused with a statement of build policy
- scripts/build-census-v1-nj_arrest_no_conviction-set.mjs — the corrected allowlist, so a known participant or case fact is written rather than refused with a statement of build policy

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- LANE STOP — this lane renders no packet and writes into no overlay directory. It changes the allowlist; the re-render is R8's and the later repairs'.
- MEASURE THE BLAST RADIUS BEFORE AND AFTER. Twenty-four families import these two runners. Run the fleet audit before and after the change and report every family whose counters move, not only the four in R8.
- NEVER fork a runner per family. Four divergent copies of one allowlist is worse than the defect: the next correction would have to be made four times and would be made three.
- NEVER invent a fact to satisfy the allowlist. A fact the platform does not hold is classified required_before_filing and surfaced to the participant, not guessed.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
RUNNERS CORRECTED:
FAMILIES WHOSE COUNTERS MOVED:
FAMILIES RENDERED: 0
FLEET AUDIT BEFORE:
FLEET AUDIT AFTER:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/s1-shared-fact-allowlist c8d912d9a1dea54043f6dbc2cda464d00946c74c
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === c8d912d9a1dea54043f6dbc2cda464d00946c74c
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/s1-shared-fact-allowlist`.
