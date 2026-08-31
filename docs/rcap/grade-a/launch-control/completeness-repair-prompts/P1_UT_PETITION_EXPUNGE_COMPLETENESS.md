# P1_UT_PETITION_EXPUNGE_COMPLETENESS

**Engine:** Codex  ·  **Lane:** completeness-repair  ·  **Families:** 7
**Worker branch:** `codex/p1-ut-petition-expunge-completeness`
**Branch from:** `33dfea59fe85b9dc86469d12e04fd65c51b480fa`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Repair 7 packet families that import neither S1 runner, so none of them waits for the post-S1 audit. They share one form family and one root cause; repair them together and re-render each against its pinned source.

**Form family:** Utah petition to expunge (1000EX/1002EX, 1020EX/1022EX, 1044XX, 1146XX, 1148XX, 1149XX)

**Shared root cause:** maps-with-canonical-and-boundary field maps whose canonicalRefusals carry no approved blank disposition; the matrix reports these seven as FAIL_MISSING_PREFILLS with 11 of 628 terminal fields written

**S1 exposure:** none. These families reach neither shared runner, proved by the transitive import graph, so they do not wait for the post-S1 audit.

## Your families — 7

| Family | Written now | Result | Counters to clear |
| --- | ---: | --- | --- |
| `ut_pet_acquittal-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_conviction-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_dismissed_with_prejudice-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_dismissed_without_prejudice-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_limitations-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_no_charges-set` | 11/628 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 617 |
| `ut_pet_traffic-set` | 9/305 | FAIL_MISSING_PREFILLS | unclassifiedBlanks 296 |

## Shared files

| File | Importers in your lane | Importers outside | You may change it |
| --- | ---: | --- | --- |
| `scripts/build-census-v1-ne-setaside-custodial-set.mjs` | 7 | ne-setaside-noncustodial-set, ne-trafficking-setaside-and-seal-set, sd_arrest_expungement-set, wv_conv_multiple_misdemeanors-set, wv_conv_single_misdemeanor-set | **no** |

## Required counter movement

Every one of the nine completeness counters must reach zero. A counter that falls but does not reach zero is not progress that ships.

- `knownRequiredFieldsMissing`
- `requiredFactsNotCollected`
- `unclassifiedBlanks`
- `incompleteRows`
- `requiredOptionsMissing`
- `requiredComponentsMissing`
- `invisibleWrites`
- `protectedWrites`
- `visualDefects`

Acceptance: **PASS_COMPLETE**.

## Source corpus

Binding: `MASTER_LIBRARY_SOURCE_DIR, bound through scripts/rcap-corpus/bootstrap-private-corpus.sh`
Preflight: `node scripts/verify-packet-build-environment.mjs --family <family> must print PACKET_BUILD_ENVIRONMENT_READY 14/14 before anything is written`

Every source binds at the exact SHA-256 its source-receipt.json records. Never commit a source binary: 59 were excluded from the C11 integration for that reason.

## Artifacts you must re-render

- **canonical** — a canonical fixture per packet, re-rendered after the repair
- **boundary** — a boundary fixture per packet, re-rendered after the repair
- **rasters** — page rasters for every rendered document
- **actualWrites** — reports/actual-writes.json recomputed from the output bytes, not from the finalizer's own claim

## Independent re-verification

This lane may not verify its own repair. Captain assigns the re-verification to a V shard that holds none of these families, and a repair is not proven until that shard returns PASS.

| Family | Shard that will re-verify |
| --- | --- |
| `ut_pet_acquittal-set` | V5_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_conviction-set` | V6_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_dismissed_with_prejudice-set` | V7_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_dismissed_without_prejudice-set` | V1_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_limitations-set` | V2_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_no_charges-set` | V3_INDEPENDENT_PACKET_VERIFICATION |
| `ut_pet_traffic-set` | V4_INDEPENDENT_PACKET_VERIFICATION |

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/p1-ut-petition-expunge-completeness/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/**`
- `scripts/build-census-v1-ut_pet_acquittal-set.mjs`
- `scripts/build-census-v1-ut_pet_conviction-set.mjs`
- `scripts/build-census-v1-ut_pet_dismissed_with_prejudice-set.mjs`
- `scripts/build-census-v1-ut_pet_dismissed_without_prejudice-set.mjs`
- `scripts/build-census-v1-ut_pet_limitations-set.mjs`
- `scripts/build-census-v1-ut_pet_no_charges-set.mjs`
- `scripts/build-census-v1-ut_pet_traffic-set.mjs`

## Prohibited paths — never write here

- `scripts/build-census-v1-ne-setaside-custodial-set.mjs`
- `scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`
- `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs`
- `data/rcap-grade-a/launch-control/**`
- `docs/rcap/grade-a/launch-control/**`
- `data/rcap-grade-a/route-obligation-census-candidate/**`
- `data/record-clearing/legal-decisions/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `private/**`

## Required inputs

- `data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json  (read from the Captain branch tip, not from the baseline)`
- `data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json`
- `scripts/rcap-packet-completeness/completeness-contract.mjs`
- `data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json`
- `docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md`

## Required outputs

- data/rcap-grade-a/wave-2/p1-ut-petition-expunge-completeness/rows.json — one row per family: itemId, status, counters before and after, every field newly written, and every blank newly given an approved disposition
- data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters

### Output schema

WEC-5: the output schema is fixed, not left to the lane. Array key `rows`, item key `itemId`, completion words `COMPLETED` and `STOPPED` only.

Detail goes in separate fields. An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>`
- `node scripts/verify-packet-build-environment.mjs --family <family>`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

## Stop conditions

- WEC-6: every stop below states its scope. A ROW stop records that family and continues; a LANE stop says why the rest are unsafe without it.
- ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. A filing with a blank offence code is not 97 percent filable.
- LANE STOP — scripts/build-census-v1-ne-setaside-custodial-set.mjs is imported by ne-setaside-noncustodial-set, ne-trafficking-setaside-and-seal-set, sd_arrest_expungement-set, wv_conv_multiple_misdemeanors-set, wv_conv_single_misdemeanor-set, which are outside this lane. You may NOT change it. A repair that cannot be completed without it stops and is reported to Captain, who will sequence a shared fix the way S1 was sequenced.
- ROW STOP — a required fact the platform genuinely does not hold is classified required_before_filing and surfaced in the packet's own participant instructions. A disposition without that surfacing is not an approved blank.
- NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- NEVER touch an S1 runner, an R8 family, or another lane's overlay directory.
- NEVER re-commit a private-corpus binary. Bind from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256.

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
SHARED FILES MODIFIED:
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A repaired packet is a complete packet. It is not independently verified, not visually reviewed, not legally approved, and not COMPLETE_PACKET_PROVEN.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/p1-ut-petition-expunge-completeness 33dfea59fe85b9dc86469d12e04fd65c51b480fa
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json > /tmp/repair-assignment.json
# STOP unless /tmp/repair-assignment.json captainBaseSha === 33dfea59fe85b9dc86469d12e04fd65c51b480fa
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/p1-ut-petition-expunge-completeness`.
