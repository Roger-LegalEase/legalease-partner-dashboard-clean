# P2_WA_VACATUR_COMPLETENESS

**Engine:** Codex  ·  **Lane:** completeness-repair  ·  **Families:** 9
**Worker branch:** `codex/p2-wa-vacatur-completeness`
**Branch from:** `33dfea59fe85b9dc86469d12e04fd65c51b480fa`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json`
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Repair 9 packet families that import neither S1 runner, so none of them waits for the post-S1 audit. They share one form family and one root cause; repair them together and re-render each against its pinned source.

**Form family:** Washington vacatur, both benches: CRRLJ-09.0100/09.0200/09.0800/09.0870 in courts of limited jurisdiction and CR-08.0900/08.0920 in superior court

**Shared root cause:** anchors-and-withheld field maps whose withheld[] entries hold required participant and case facts; all nine report FAIL_MISSING_REQUIRED_FACTS at 4 to 6 fields written

**S1 exposure:** none. These families reach neither shared runner, proved by the transitive import graph, so they do not wait for the post-S1 audit.

## Your families — 9

| Family | Written now | Result | Counters to clear |
| --- | ---: | --- | --- |
| `wa_vac_cannabis-set` | 4/50 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 15, unclassifiedBlanks 28 |
| `wa_vac_domestic_violence-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |
| `wa_vac_felony-set` | 6/93 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 31, unclassifiedBlanks 53 |
| `wa_vac_homicide_victim_prostitution-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |
| `wa_vac_misdemeanor_ordinary-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |
| `wa_vac_substance_use_disorder-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |
| `wa_vac_survivor_felony-set` | 6/93 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 31, unclassifiedBlanks 53 |
| `wa_vac_survivor_misdemeanor-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |
| `wa_vac_treaty_fishing-set` | 4/86 | FAIL_MISSING_REQUIRED_FACTS | knownRequiredFieldsMissing 21, unclassifiedBlanks 56 |

## Shared files

| File | Importers in your lane | Importers outside | You may change it |
| --- | ---: | --- | --- |
| `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs` | 9 | none | **yes** |

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
Preflight: `node scripts/verify-packet-build-environment.mjs --family <family> must print PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing before anything is written`

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
| `wa_vac_cannabis-set` | V5_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_domestic_violence-set` | V6_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_felony-set` | V7_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_homicide_victim_prostitution-set` | V1_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_misdemeanor_ordinary-set` | V2_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_substance_use_disorder-set` | V3_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_survivor_felony-set` | V4_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_survivor_misdemeanor-set` | V5_INDEPENDENT_PACKET_VERIFICATION |
| `wa_vac_treaty_fishing-set` | V6_INDEPENDENT_PACKET_VERIFICATION |

## Owned paths — write only here

- `data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/**`
- `scripts/build-census-v1-wa_vac_cannabis-set.mjs`
- `scripts/build-census-v1-wa_vac_domestic_violence-set.mjs`
- `scripts/build-census-v1-wa_vac_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_homicide_victim_prostitution-set.mjs`
- `scripts/build-census-v1-wa_vac_misdemeanor_ordinary-set.mjs`
- `scripts/build-census-v1-wa_vac_substance_use_disorder-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_misdemeanor-set.mjs`
- `scripts/build-census-v1-wa_vac_treaty_fishing-set.mjs`
- `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs`

## Prohibited paths — never write here

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

- data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/rows.json — one row per family: itemId, status, counters before and after, every field newly written, and every blank newly given an approved disposition
- data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters
- data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters

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
- You own scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs because every script that imports it is one of your families. Changing it changes all of them, which is the point; measure every one of your families before and after.
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
git checkout -b codex/p2-wa-vacatur-completeness 33dfea59fe85b9dc86469d12e04fd65c51b480fa
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json > /tmp/repair-assignment.json
# STOP unless /tmp/repair-assignment.json captainBaseSha === 33dfea59fe85b9dc86469d12e04fd65c51b480fa
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/p2-wa-vacatur-completeness`.
