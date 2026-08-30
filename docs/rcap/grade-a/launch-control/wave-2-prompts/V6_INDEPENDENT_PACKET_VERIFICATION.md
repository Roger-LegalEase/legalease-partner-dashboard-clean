# V6_INDEPENDENT_PACKET_VERIFICATION

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** independent-verification
**Worker branch:** `codex/v6-independent-packet-verification`
**Branch from:** `ebb99d663f857f58a173c1d29eb73d0f15e70cbd`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Independently verify 6 of the 43 packet families C11 built. You did not build them and you may not repair them: this lane proves or refuses, and a repair is someone else's assignment.

## Your exact scope — 6 familyIds

- `ca-1203-4a-set`
- `nj_disorderly_persons-set`
- `pa_790_nonconviction-set`
- `ut_pet_conviction-set`
- `wa_vac_domestic_violence-set`
- `wa_vac_treaty_fishing-set`

## What you must prove for every family

- exact route identity
- exact packet-family identity
- source identities and SHA-256 values
- complete component set
- correct official form or approved composer
- canonical and boundary artifact hashes
- actual-write verification
- zero protected-field writes
- signatures and service blocks preserved
- page count and page order
- no clipping or overlap
- fee and waiver treatment
- filing destination
- service and notice
- later-completion fields
- no stale artifact
- no wrong-route reuse
- no source substitution
- commercial status remains closed

Return one of: `PASS`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_APPROVAL_INPUT`. **Never return PASS on an obligation you did not evaluate.**

You are not the builder. This shard's worker must not be the C11 builder. The builder's report is evidence; independent verification is proof.

## Reuse decision

**REUSE_AS_IS** — These families are built and integrated. This lane verifies them; it does not rebuild or repair them.

## Required inputs

- `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json  (read from the Captain branch tip, not from the baseline)`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/RESIDUAL_WORK.json`
- `data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json`
- `docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md`

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/verification/v6/**`

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
- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`

## Required outputs

- data/rcap-grade-a/wave-2/verification/v6/rows.json — one row per family: itemId, verdict, and one entry per proof obligation with the exact value observed and where it was read

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `PASS`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_APPROVAL_INPUT`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/verify-packet-build-environment.mjs --family <family>`
- `node scripts/grade-a-launch-control/verify-c11-return.mjs`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ROW STOP — BLOCKED_SOURCE when the family's pinned source cannot be bound from MASTER_LIBRARY_SOURCE_DIR at its recorded SHA-256. The 59 excluded corpus binaries are not in git by design; bind them through the corpus bootstrap.
- ROW STOP — BLOCKED_LEGAL_APPROVAL_INPUT when a proof obligation depends on a legal determination that is not in a controlling record.
- ROW STOP — FAIL_REPAIR_REQUIRED when a proof obligation is observably wrong. Record what is wrong and stop; do not fix it.
- NEVER return PASS on a proof obligation you did not evaluate. A shard that cannot evaluate an obligation returns BLOCKED for that family, not PASS with a note.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
FAMILIES PASSED:
FAILED_REPAIR_REQUIRED:
BLOCKED_SOURCE:
BLOCKED_LEGAL_APPROVAL_INPUT:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A PASS is independent technical proof. It is not an output-level legal approval, it opens no commercial route and it proves no packet on its own.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/v6-independent-packet-verification ebb99d663f857f58a173c1d29eb73d0f15e70cbd
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === ebb99d663f857f58a173c1d29eb73d0f15e70cbd
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/v6-independent-packet-verification`.
