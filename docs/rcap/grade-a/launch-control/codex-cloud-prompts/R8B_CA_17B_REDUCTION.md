# R8B_CA_17B_REDUCTION

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** completeness-repair
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `0b89b1bf6b0b211ca73784724b1e0aea409010a3`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> Split out of `R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD`, which ran four families as one assignment and returned zero files changed on a shared environment failure. R8 ran four families as one assignment and returned zero files changed on a shared environment failure. Four lanes stop for their own reasons, and a lane that stops says which family was hard.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family ca-17b-reduction-set \
  --codex-cloud \
  --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**.
 Captain observed `PACKET_BUILD_ENVIRONMENT_READY: 14/14` for this family against the then-current roster of 14; the roster has grown since, so expect the number above and not that one.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Repair ca-17b-reduction-set until all nine completeness counters are zero. One family, its own lane, its own stop conditions.

## The exact defect — FAIL_MISSING_REQUIRED_FACTS

Written 8/187. Nonzero counters:

- `knownRequiredFieldsMissing` — 54
- `unclassifiedBlanks` — 71
- `incompleteRows` — 1
- `requiredOptionsMissing` — 16
- `requiredComponentsMissing` — 3

Blank dispositions now: `{"NOT_APPLICABLE_ON_THIS_ROUTE":24,"PROTECTED_FIELD":9,"LATER_COMPLETION":5,"KNOWN_FACT_NOT_WRITTEN":54,"ROUTE_OPTION_NOT_SELECTED":16,"UNCLASSIFIED_BLANK":71}`

### The first 40 of 145 findings

| Counter | Field | Label | Why |
| --- | --- | --- | --- |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Code1[0]` | Code (Penal, Vehicle, etc.) | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Section1[0]` | Section | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].TypeOff1[0]` | Type of offense (felony, misdemeanor, or infract | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row2[0].Code2[0]` | Code (Penal, Vehicle, etc.) | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row2[0].Section2[0]` | Section | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row2[0].TypeOff2[0]` | Type of offense (felony, misdemeanor, or infract | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row2[0].Reduce2[0]` | Eligible for reduction to misdemeanor under Pena | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row2[0].Offense2[0]` | Eligible for reduction to infraction under Penal | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row3[0].Code3[0]` | Code (Penal, Vehicle, etc.) | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row3[0].Section3[0]` | Section | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row3[0].TypeOff3[0]` | Type of offense (felony, misdemeanor, or infract | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row3[0].Reduce3[0]` | Eligible for reduction to misdemeanor under Pena | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row3[0].Offense3[0]` | Eligible for reduction to infraction under Penal | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row4[0].Code4[0]` | Code (Penal, Vehicle, etc.) | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row4[0].Section4[0]` | Section | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row4[0].TypeOff4[0]` | Type of offense (felony, misdemeanor, or infract | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row4[0].Reduce4[0]` | Eligible for reduction to misdemeanor under Pena | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row4[0].Offense4[0]` | Eligible for reduction to infraction under Penal | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row5[0].Code5[0]` | Code (Penal, Vehicle, etc.) | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row5[0].Section5[0]` | Section | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row5[0].TypeOff5[0]` | Type of offense (felony, misdemeanor, or infract | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row5[0].Reduce5[0]` | Eligible for reduction to misdemeanor under Pena | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row5[0].Offense5[0]` | Eligible for reduction to infraction under Penal | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| requiredOptionsMissing | `CR-180[0].Page1[0].LI2[0].ProbationGranted[0]` | Felony or misdemeanor with probation granted (Pe | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page1[0].LI2[0].li2a[0].ProbationGrantedReason[0]` | has fulfilled the conditions of probation for th | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page1[0].LI2[0].li2b[0].ProbationGrantedReason[0]` | has been discharged from probation prior to the  | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI2[0].li2c[0].ProbationGrantedReason[0]` | should be granted relief in the interests of jus | a narrative the filing requires, with no approved reason for being blank |
| knownRequiredFieldsMissing | `CR-180[0].Page1[0].LI2[0].li2c[0].TextField6[0]` | Explain why granting a dismissal would be in the | a narrative the filing requires, with no approved reason for being blank |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI3[0].OffenseWSentence[0]` | Misdemeanor or infraction with sentence other th | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI3[0].li3a[0].ProbationNotGrantedReason[0]` | has lived an honest and upright life since prono | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| knownRequiredFieldsMissing | `CR-180[0].Page2[0].LI3[0].li3b[0].ProbationNotGrantedReason[0]` | should be granted relief in the interests of jus | a narrative the filing requires, with no approved reason for being blank |
| knownRequiredFieldsMissing | `CR-180[0].Page2[0].LI3[0].li3b[0].TextField6[0]` | Explain why granting a dismissal would be in the | a narrative the filing requires, with no approved reason for being blank |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI4[0].li4[0].OffenseWSentence[0]` | Misdemeanor conviction under Penal Code section  | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| knownRequiredFieldsMissing | `CR-180[0].Page2[0].LI4[0].li4[0].TextField6[0]` | Petitioner has completed a term of probation for | This states that the build's allowlist offers nothing. It says nothing about whether the f |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI5[0].CheckBox19[0]` | Felony county jail sentence under Penal Code sec | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI5[0].li5a[0].FelonyNotUnderSup[0]` | more than one year has elapsed since petitioner  | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI5[0].li5b[0].FelonyNotUnderSup[0]` | more than two years have elapsed since petitione | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| requiredOptionsMissing | `CR-180[0].Page2[0].LI5[0].li5c[0].FelonyNotUnderSup[0]` | more than two years have elapsed since petitione | A fixture that does not establish a route election is an incomplete fixture, not a reason  |
| knownRequiredFieldsMissing | `CR-180[0].Page2[0].LI5[0].li5c[0].T66[0]` | Explain why granting a dismissal would be in the | a narrative the filing requires, with no approved reason for being blank |
| requiredOptionsMissing | `CR-180[0].Page3[0].LI6[0].li6[0].OffenseWSentence[0]` | Felony prison sentence that would have been elig | A fixture that does not establish a route election is an incomplete fixture, not a reason  |

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8b-ca-17b-reduction/**`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-all50/overlays/census-v1/**/nj-disorderly-persons-set*`
- `data/rcap-all50/overlays/census-v1/**/ca-1203-43-set*`
- `data/rcap-all50/overlays/census-v1/**/az-marijuana-expungement-superior-court-set*`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/ — the family re-rendered with its defects closed
- data/rcap-grade-a/codex-cloud/r8b-ca-17b-reduction/rows.json — one row: itemId, status, the nine counters after your change, and what you changed to close each

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ca-17b-reduction-set`
- `node scripts/verify-packet-build-environment.mjs --family ca-17b-reduction-set --codex-cloud --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — one family. The other three R8 families are three other lanes and are not yours.
- LANE STOP — you do not change the completeness contract, and you do not change a shared runner.
- NEVER invent a fact. An unavailable fact is REQUIRED_BEFORE_FILING, declared explicitly and disclosed in participant-instructions.md, never guessed.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, court-only or prosecutor-only.
- ROW STOP — a counter you cannot zero is a STOPPED return naming the counter and the exact rows that make it nonzero.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
NINE COUNTERS ZERO: YES/NO
COUNTERS AFTER:
WHAT CHANGED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family is a repaired family. It is not verified, not approved and not sellable.
