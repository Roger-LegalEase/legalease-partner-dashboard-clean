# R7_PACKET_REPAIR

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r7-packet-repair`
**Branch from:** `c8d912d9a1dea54043f6dbc2cda464d00946c74c`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Repair the C11 return without rebuilding it: write the missing product-wiring record for the built families that lack one, and complete the Pennsylvania § 6308 packet component specification. The four families in R8 are excluded — they own their own repair, wiring record included. None of the 43 built families is rerun.

## Your exact scope — 23 familyIds

- `nj_arrest_no_conviction-set`
- `nj_clean_slate-set`
- `nj_indictable_conviction-set`
- `nj_ordinance-set`
- `ny_160_59_petition-set`
- `ny_mrta_marijuana-set`
- `oh_marijuana_expungement-set`
- `pa_490_nonconviction-set`
- `pa_6308_underage-set`
- `pa_790_nonconviction-set`
- `pa_9122_1_limited_access-set`
- `pa_summary_conviction-set`
- `rcap-oh-custom-pleading-clean-tracks`
- `ri_nonconviction_sealing-set`
- `wa_vac_cannabis-set`
- `wa_vac_domestic_violence-set`
- `wa_vac_felony-set`
- `wa_vac_homicide_victim_prostitution-set`
- `wa_vac_misdemeanor_ordinary-set`
- `wa_vac_substance_use_disorder-set`
- `wa_vac_survivor_felony-set`
- `wa_vac_survivor_misdemeanor-set`
- `wa_vac_treaty_fishing-set`

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

- `data/rcap-grade-a/wave-2/r7-packet-repair/**`

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

- data/rcap-grade-a/wave-2/r7-packet-repair/rows.json — one row per family: itemId, status, what was missing, what was written
- the missing product-wiring.json inside each family's existing overlay directory, stating familyId, routeKeys, implementationStrategy, fieldMap, generationAllowed false, runtimeSelectable false, commercialRoutesOpened 0

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-c11-return.mjs`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- NEVER rebuild a built family. Its artifacts are byte-checked and its source receipt is exact; only the record is missing.
- NEVER re-commit an excluded corpus binary. 59 were removed at integration; bind sources from MASTER_LIBRARY_SOURCE_DIR and compare against the family's own source-receipt.json.
- ROW STOP — a family whose route keys or implementation strategy cannot be read from a committed record. Do not infer them from the directory name.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
WIRING RECORDS WRITTEN:
COMPONENT SPECIFICATIONS COMPLETED:
FAMILIES REBUILT: 0
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r7-packet-repair c8d912d9a1dea54043f6dbc2cda464d00946c74c
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === c8d912d9a1dea54043f6dbc2cda464d00946c74c
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r7-packet-repair`.
