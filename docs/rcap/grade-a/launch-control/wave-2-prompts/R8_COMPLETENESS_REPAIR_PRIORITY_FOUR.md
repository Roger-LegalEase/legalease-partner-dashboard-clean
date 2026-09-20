# R8_COMPLETENESS_REPAIR_PRIORITY_FOUR

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r8-completeness-repair-priority-four`
**Branch from:** `c8d912d9a1dea54043f6dbc2cda464d00946c74c`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Repair the four families whose PASS was revoked, in priority order A to D, AFTER S1 has corrected the shared allowlist. Each has a complete per-field ledger in the repair plan: exactly which known facts must be written, which elections the route decides, which blanks need an approved disposition, and which components must render. Re-render each against its pinned source and prove it with the completeness verifier. You own each family's overlay directory and its own build script, so you can write every output this assignment requires.

## Your exact scope — 4 familyIds

- `nj_disorderly_persons-set`
- `ca-17b-reduction-set`
- `ca-1203-43-set`
- `az_marijuana_expungement_superior_court-set`

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

- `data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`

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

- data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/rows.json — one row per family: itemId, status, counters before and after, and every field newly written or newly classified
- data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts
- data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>`
- `node scripts/verify-packet-build-environment.mjs --family <family>`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. There is no partial credit: a filing with a blank offence code is not 97 percent filable.
- ROW STOP — a required fact the platform genuinely does not hold is classified REQUIRED_BEFORE_FILING and surfaced to the participant in the packet's own instructions. A disposition without that surfacing is not an approved blank.
- NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one, because the blank is visible and the guess is not.
- NEVER write a protected field: participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- NEVER re-commit a private-corpus binary. Bind sources from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256.
- LANE STOP — do not start until S1 has landed. The two shared runners are S1's, not yours: runWestFamilyCli serves nine families and runEastFamily fifteen, and changing either from here would alter twenty families you were not asked to touch.
- ROW STOP — a repair that cannot be completed without changing a shared runner stops and is reported to S1 rather than forking the runner.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
FAMILIES REPAIRED:
PASS_COMPLETE:
COUNTERS REMAINING:
FACTS CLASSIFIED REQUIRED_BEFORE_FILING:
SHARED RUNNERS MODIFIED: 0
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r8-completeness-repair-priority-four c8d912d9a1dea54043f6dbc2cda464d00946c74c
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === c8d912d9a1dea54043f6dbc2cda464d00946c74c
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r8-completeness-repair-priority-four`.
