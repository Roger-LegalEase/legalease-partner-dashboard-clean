# R4_SOURCE_IDENTITY_AND_ACQUISITION

**Wave:** 2  ·  **Engine:** Codex  ·  **Lane:** residual
**Worker branch:** `codex/r4-source-identity-and-acquisition`
**Branch from:** `ebb99d663f857f58a173c1d29eb73d0f15e70cbd`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Resolve 19 unresolved identities and 30 unknown official URLs, acquire the 49 identified obligations from the hosts that answered, promote the 33 inventory candidates, settle the two C11 source-identity stops, and find the real Utah 402 form number.

## Your exact scope — 33 obligationKeys

- `UT-402-MOTION-TO-REDUCE-FORM-IDENTITY`
- `ar-act346-set::The ACIC petition counterpart to the Act 346 order to dismiss and seal.`
- `ar-misdemeanor-seal-set::The ACIC petition for the misdemeanour branch, A.C.A. 16-90-1405.`
- `ar-veterans-court-set::The ACIC order counterpart for the veterans treatment court route.`
- `de_mandatory_expungement-set::The application for mandatory expungement to the State Bureau of Identification under 11 Del. C. 4373.`
- `fl-administrative-set::The FDLE application for administrative expunction under section 943.0581, Fla. Stat.`
- `ia-12346-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-12347-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-7251-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-901c2-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `ia-901c3-set::The Iowa expungement application prescribed as Iowa R. Crim. P. 2.86 Form 2.`
- `ia-901c3-set::The certification of service filed with an Iowa Rule 2.86 expungement application.`
- `in_arrest_no_charges-set::CCA-GF-0120-3016`
- `in_arrest_no_charges-set::CCA-XP-0120-7002 Form ACR`
- `in_arrest_no_charges-set::Confidential Information Form`
- `in_conviction_d6-set::CCA-GF-0120-3016`
- `in_conviction_d6-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_d6-set::Confidential Information Form`
- `in_conviction_felony-set::CCA-GF-0120-3016`
- `in_conviction_felony-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_felony-set::Confidential Information Form`
- `in_conviction_misd-set::CCA-GF-0120-3016`
- `in_conviction_misd-set::CCA-XP-0120-7002 Form ACR`
- `in_conviction_misd-set::Confidential Information Form`
- `in_section1_petition-set::CCA-GF-0120-3016`
- `in_section1_petition-set::CCA-XP-0120-7002 Form ACR`
- `in_section1_petition-set::Confidential Information Form`
- `mi_setaside_trafficking-set::Proof of Service`
- `ne-trafficking-setaside-and-seal-set`
- `rcap-in-custom-pleading::CCA-GF-0120-3016`
- `rcap-in-custom-pleading::CCA-XP-0120-7002 Form ACR`
- `rcap-in-custom-pleading::Confidential Information Form`
- `wa_blake_vacatur_and_lfo_refund-set`

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

- `data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/**`

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

- data/rcap-grade-a/route-obligation-census-v1/identity-resolution/wave-2/rows.json — one row per obligation: itemId, status, exact document name, issuing authority, form number where one exists, official URL, or an explicit unresolved with what would settle it
- data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/acquired.json — per acquired document: issuing authority, official URL, retrieval time, byte length, SHA-256

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Use the array key `rows`, the item key `itemId`, and only these completion words: `COMPLETED`, `STOPPED`.

Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

Do not run a broad tracked-file mutation suite: other workers are active.

## Stop conditions

- WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.
- ROW STOP — an identity that cannot be settled from committed records is recorded unresolved with what would settle it. A wrong resolution sends someone to acquire the wrong document, which is worse than an open row.
- PER HOST, NOT PER WAVE (WEC-3) — the last probe result for every acquisition target is in this assignment. Attempt the hosts recorded reachable. Do NOT re-probe a host recorded refused: escalate it. Reaching a host is not acquiring a document; acquisition needs the body and its SHA-256.
- NEVER — do not commit an acquired PDF, the archive, or any extracted source file. Commit the receipt. 59 files were excluded from the C11 integration for exactly this reason.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
ASSIGNMENT READ FROM:
COMMIT:
IDENTITIES RESOLVED:
IDENTITIES OPEN:
DOCUMENTS ACQUIRED:
DOCUMENTS PROMOTED:
HOSTS ESCALATED:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/r4-source-identity-and-acquisition ebb99d663f857f58a173c1d29eb73d0f15e70cbd
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json
# STOP unless /tmp/wave-2-assignments.json captainBaseSha === ebb99d663f857f58a173c1d29eb73d0f15e70cbd
# your assignment is the entry whose assignmentId matches this prompt's title
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2
```

Commit your work and `git push -u origin codex/r4-source-identity-and-acquisition`.
