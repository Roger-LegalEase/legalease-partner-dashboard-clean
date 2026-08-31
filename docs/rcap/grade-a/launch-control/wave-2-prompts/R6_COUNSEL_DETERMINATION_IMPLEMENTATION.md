# R6_COUNSEL_DETERMINATION_IMPLEMENTATION

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r6-counsel-determination-implementation`
**Branch from:** `c8d912d9a1dea54043f6dbc2cda464d00946c74c`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Implement Lawrence's four determinations exactly as written. Three are Category A, and two of those carry a condition that changes what may be built. Do not re-research these decisions and do not send them back to counsel.

## Your exact scope — 4 routeKeys

- `obligation:research-decision-route:AL:al-uncharged-arrest:de_novo_court_review_after_final_denial`
- `obligation:research-decision-route:NY:ny_160_55_violation:pre_1991_legacy_motion`
- `obligation:track-only:NE:ne-postconviction-routing`
- `obligation:track-only:UT:ut_adj_reduction_402`

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

- `data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/**`

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

- data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/rows.json — one row per route: itemId, status, the branch identity created, and for New York the two date-specific subroutes, and for Utah the nine branches with their consent gate

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/generate-counsel-determination-delta.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- NEVER — New York may not be built as one generic pre-November 1991 motion. The screening asks the exact conviction date, and the date selects the motion theory: § 160.55(3) before September 1 1980, and a motion to enter and enforce the omitted legacy order under former § 160.55 from September 1980 through October 1991.
- NEVER — Utah's two-degree, violent-felony, shortened three-year and substantial-assistance branches refuse without signed prosecutorial consent. A participant's assertion that the prosecutor agrees is not consent.
- NEVER — Nebraska generates no merits pleading. Build guidance, the one-year deadline warning, a records checklist and referrals, and stop before selecting, framing, drafting, verifying or filing any postconviction ground.
- ROW STOP — Alabama's circuit petition requires proof that the AJIC administrative process was exhausted. Without exhaustion the circuit court has no subject-matter jurisdiction, so the packet must verify it before generating.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
ROUTES IMPLEMENTED:
NY SUBROUTES CREATED:
UT BRANCHES GATED:
NE MERITS PLEADING GENERATED: NO
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r6-counsel-determination-implementation c8d912d9a1dea54043f6dbc2cda464d00946c74c
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === c8d912d9a1dea54043f6dbc2cda464d00946c74c
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r6-counsel-determination-implementation`.
