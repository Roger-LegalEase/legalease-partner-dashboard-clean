# R2_ALREADY_ANSWERED_ENGINEERING

**Wave:** 2  ·  **Engine:** Claude Remote  ·  **Lane:** residual
**Worker branch:** `claude/r2-already-answered-engineering`
**Branch from:** `ebb99d663f857f58a173c1d29eb73d0f15e70cbd`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Implement the 37 legal-review rows a controlling decision already answers. C8 audited every citation and implemented none; an audit is not an implementation, and this lane is measured in engineering effects, not in citations.

## Your exact scope — 37 routeKeys

- `obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_agency_history_error`
- `obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017_favorable_termination_mandatory`
- `obligation:runtime-contract-cohort:UT:path-m-juvenile-expungement:favorable_outcome_branch`
- `obligation:runtime-only:SC:juvenile-expungement`
- `obligation:runtime-only:SC:pardon-guidance-for-otherwise-ineligible-convictions`
- `obligation:track-only:AK:ak-sej`
- `obligation:track-only:AR:ar-preadjudication-probation`
- `obligation:track-only:DE:de_attorney_general_expungement`
- `obligation:track-only:GA:ga-fo-sentencing-post2026`
- `obligation:track-only:GA:ga-time-expired`
- `obligation:track-only:LA:la-999-expedited-expungement`
- `obligation:track-only:ND:nd-juvenile-records-routing`
- `obligation:track-only:NE:ne-pardon-routing`
- `obligation:track-only:WI:wi_def_961_47`
- `obligation:track-pathway:AK:ak-juvenile:juvenile-record-sealing-as-47-12-300`
- `obligation:track-pathway:AK:ak-pardon:executive-pardon-backstop`
- `obligation:track-pathway:CA:ca-851-8:tool-4-arrest-record-sealing`
- `obligation:track-pathway:CT:ct-cannabis-auto:cannabis-conviction-erasure`
- `obligation:track-pathway:KY:ky_juvenile_record_expungement:juvenile-automatic-dismissal`
- `obligation:track-pathway:KY:ky_juvenile_record_expungement:juvenile-petition-610330`
- `obligation:track-pathway:LA:la-985-3-immediate-expungement:immediate-expungement-after-successful-court-program-completion-art-985-3`
- `obligation:track-pathway:MD:md_10103_legacy_police:police-record-expungement-when-no-charge-was-filed-under-10-103`
- `obligation:track-pathway:MT:mt_nonconviction_removal:non-conviction-criminal-history-removal-through-criss`
- `obligation:track-pathway:NE:ne-juvenile-sealing-routing:juvenile-petition-backstop`
- `obligation:track-pathway:NH:nh_auto_nonconviction:annulment-after-dismissal-acquittal-or-nonprosecution`
- `obligation:track-pathway:NM:nm_cannabis:cannabis-expungement`
- `obligation:track-pathway:NV:nv_seal_deferred:deferred-judgment-dismissal-and-sealing-under-nrs-176-211`
- `obligation:track-pathway:OR:or_acquittal:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`
- `obligation:track-pathway:PA:pa_acquittal_auto:path-b-complete-acquittal-not-guilty-expungement`
- `obligation:track-pathway:PA:pa_ard_expungement:path-d-ard-expungement`
- `obligation:track-pathway:RI:ri_filed_complaints:path-e-filed-complaint-relief-under-12-10-12`
- `obligation:track-pathway:SC:sc_pti_17_22_150:diversion-or-program-completion-expungement`
- `obligation:track-pathway:SD:sd_23a_3_34_auto:automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases`
- `obligation:track-pathway:SD:sd_diversion:diversion-expungement`
- `obligation:track-pathway:TN:tn_acquittal_immediate:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106`
- `obligation:track-pathway:UT:ut_auto_clean_slate:path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals`
- `obligation:track-pathway:WI:wi_exp_942_08_mandatory:adult-conviction-expungement-under-wis-stat-973-015`

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

- `data/rcap-grade-a/wave-2/r2-already-answered-engineering/**`

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

- data/rcap-grade-a/wave-2/r2-already-answered-engineering/rows.json — one row per route: itemId, status, the decision record id, the file and field the effect lands in, and the exact engineering change made

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ROW STOP — a row whose cited decision record cannot be found. An asserted answer no record backs is the most dangerous outcome in this lane.
- ROW STOP — a row whose decision record says something different from the retriage. The record wins and the retriage is the defect; record both and continue.
- READ FIRST — the Oregon acquittal row already has a recorded conflict between the retriage's aggregate citation and a newer counsel record. Its resolution is a Captain input carried in the lane detail, not a question for this worker.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
ROWS IMPLEMENTED:
ROWS STOPPED:
DECISION RECORDS CITED:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b claude/r2-already-answered-engineering ebb99d663f857f58a173c1d29eb73d0f15e70cbd
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === ebb99d663f857f58a173c1d29eb73d0f15e70cbd
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin claude/r2-already-answered-engineering`.
