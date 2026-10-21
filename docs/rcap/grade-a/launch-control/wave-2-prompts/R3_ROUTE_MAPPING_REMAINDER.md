# R3_ROUTE_MAPPING_REMAINDER

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r3-route-mapping-remainder`
**Branch from:** `c8d912d9a1dea54043f6dbc2cda464d00946c74c`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Correct the 29 mapping rows C9 stopped on, settle the 13 stage/branch pair bindings it could not, and resolve the Nebraska non-custodial vehicle conflict: the worklist says custom_pleading where the controlling legal design resolves the route to the official CC-6-11 packet.

## Your exact scope — 30 routeKeys

- `obligation:runtime-only:CA:tool-3-petition-based-felony-sealing`
- `obligation:runtime-only:CO:juvenile-expungement-19-1-306`
- `obligation:track-pathway:CO:co_clean_slate:automatic-clean-slate-sealing-13-3-117`
- `obligation:runtime-only:DC:dc_juvenile_sealing_16_2335`
- `obligation:runtime-only:ID:human-trafficking-survivor-vacatur-and-expungement`
- `obligation:runtime-only:ID:juvenile-expungement`
- `obligation:runtime-only:ID:withheld-judgment-idaho-code-19-2604-review-branch`
- `obligation:runtime-only:IL:human-trafficking-survivor-vacatur-and-expungement`
- `obligation:runtime-only:IL:juvenile-automatic-or-petition-expungement`
- `obligation:runtime-only:MD:juvenile-expungement`
- `obligation:runtime-only:ME:pardon-route`
- `obligation:track-pathway:MN:mn_299c11_arrest_demand:arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11`
- `obligation:track-pathway:MN:mn_auto_cannabis_nonfelony:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06`
- `obligation:unit:MN:mn_prosecutor_agreed:mn_prosecutor_agreed-court-sealing`
- `obligation:runtime-only:ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`
- `obligation:runtime-only:NH:out-of-state-federal-or-military-record-guidance`
- `obligation:runtime-only:NV:controlled-substance-possession-sealing-under-nrs-453-3365`
- `obligation:runtime-only:NY:conditional-treatment-sealing-under-cpl-160-58`
- `obligation:runtime-only:OH:juvenile-sealing-and-expungement`
- `obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies`
- `obligation:runtime-only:SC:human-trafficking-survivor-expungement`
- `obligation:runtime-only:SD:controlled-substance-deferred-disposition-route`
- `obligation:runtime-only:SD:juvenile-delinquency-sealing`
- `obligation:unit:SD:sd_arrest_expungement:sd-arrest-stage-3-filing-service-and-notice-of-entry`
- `obligation:runtime-only:VT:juvenile-sealing`
- `obligation:runtime-only:WI:executive-pardon-guidance`
- `obligation:runtime-only:WI:juvenile-adjudication-expungement-under-wis-stat-938-355-4m`
- `obligation:runtime-only:WV:juvenile-record-relief`
- `obligation:runtime-only:WY:juvenile-minor-expungement-w-s-14-6-241`
- `ne-setaside-noncustodial-set`

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

- `data/rcap-grade-a/wave-2/r3-route-mapping-remainder/**`

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

- data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json — one row per mapping row and pair binding: itemId, status, current mapping, what is wrong, corrected mapping, evidence

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-route-obligation-census/verify-national-route-obligation-census.mjs`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ROW STOP — a runtime pathway with no census stage, or two stages claiming one pathway. Report it; do not resolve it by picking one.
- LANE STOP — any correction that would move the census denominator.
- NEVER — no custom pleading may be invented from the Nebraska vehicle conflict. Correct the assignment vehicle or record an approved exact hybrid design.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
MAPPING ROWS RECONCILED:
PAIR BINDINGS SETTLED:
DENOMINATOR MOVEMENT: 0
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r3-route-mapping-remainder c8d912d9a1dea54043f6dbc2cda464d00946c74c
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === c8d912d9a1dea54043f6dbc2cda464d00946c74c
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r3-route-mapping-remainder`.
