# C12_NONPRODUCTION_ACCEPTANCE_PREP

**Archetype:** Nonproduction participant-data-rights and hosted-acceptance preparation
**Lane:** platform
**Worker branch:** `codex/c12-nonproduction-acceptance-prep`
**Branch from:** `227f095d5d1493feca56779cf60c6f177caebd61` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

Stand up the dedicated synthetic nonproduction acceptance project, apply the participant-data-rights migration there under the standing one-time authorization, and run hosted export, matter-deletion and account-deletion acceptance against it.

Nothing outside this scope belongs to you. Every row here is allocated to you and to no other lane; the dispatch refuses to generate if two lanes claim one row.

## Required inputs

- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `supabase/migrations/20260830120000_participant_data_rights.sql`
- `data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json`

## Owned paths — write only here

- `data/rcap-grade-a/participant-data-rights/**`

## Prohibited paths — never write here

- `data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json`
- `docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md`
- `data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`

## Required outputs

- data/rcap-grade-a/participant-data-rights/hosted-acceptance.json — the project ref, the proof it is synthetic, the migration's SHA-256 as applied, and the result of each acceptance case

## Focused tests

- `node scripts/verify-participant-data-rights.mjs`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active, and a mutation harness that leaves a tracked file altered fails their runs, not only yours.

## Stop conditions

- SYNTHETIC NONPRODUCTION ONLY. No Production migration, deployment, environment-variable change or real participant data. The authorization covers one dedicated synthetic acceptance project and nothing else.
- If the project ref cannot be recorded and proven synthetic, this lane stops rather than proceeding.
- Do not contact real downstream processors with deletion requests. The processor adapters run against the synthetic project's own fixtures.

Stopping with an honest account of what is missing is a complete return. A result reported as done on evidence nobody opened is not.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
PROJECT REF:
PROVEN SYNTHETIC:
MIGRATION APPLIED:
ACCEPTANCE CASES PASSED:
REAL PARTICIPANT DATA TOUCHED: NO
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/c12-nonproduction-acceptance-prep 227f095d5d1493feca56779cf60c6f177caebd61
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/c12-nonproduction-acceptance-prep`.
