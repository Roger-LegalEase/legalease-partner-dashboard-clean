# R8A_NJ_DISORDERLY_PERSONS

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
  --family nj_disorderly_persons-set \
  --codex-cloud \
  --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 15/15`**.
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

Repair nj_disorderly_persons-set until all nine completeness counters are zero. One family, its own lane, its own stop conditions.

## The exact defect — FAIL_MISSING_REQUIRED_FACTS

Written 7/179. Nonzero counters:

- `knownRequiredFieldsMissing` — 88

Blank dispositions now: `{"KNOWN_FACT_NOT_WRITTEN":88,"PARTICIPANT_ELECTION_GENUINE":51,"PROTECTED_FIELD":33}`

### The first 40 of 88 findings

| Counter | Field | Label | Why |
| --- | --- | --- | --- |
| knownRequiredFieldsMissing | `formPrint` | formPrint | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `formSafeClear` | formSafeClear | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `DefName` | DefName | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `arrestOff1` | arrestOff1 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `arrestOff2` | arrestOff2 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `arrestStatute` | arrestStatute | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `arrestMuni` | arrestMuni | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `origCaseNums` | origCaseNums | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contOwe` | contOwe | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `oweDocket` | oweDocket | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `oweAmt` | oweAmt | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `cnt` | cnt | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contArrestDt` | contArrestDt | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contOffense1` | contOffense1 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contOffense2` | contOffense2 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contStatute` | contStatute | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contArrestMuni` | contArrestMuni | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contOrigNums` | contOrigNums | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `contDsmissOff2` | contDsmissOff2 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `seek5yrs` | seek5yrs | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `seek34degree` | seek34degree | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `seek5yrsDetails` | seek5yrsDetails | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `seekJuvNever` | seekJuvNever | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `changeName` | changeName | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `DefAddrStr` | DefAddrStr | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `DefAddr2` | DefAddr2 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `DefAddr3` | DefAddr3 | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `ExpungeCntyName` | ExpungeCntyName | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `orderHearYr` | orderHearYr | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `hearDay` | hearDay | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `hearTime` | hearTime | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `hearTimeM` | hearTimeM | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `sigHearJdg` | sigHearJdg | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `gradDC` | gradDC | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `marijuana` | marijuana | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `cleanSlate` | cleanSlate | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `orderFinalDay` | orderFinalDay | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `MuniCrts` | MuniCrts | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `probDivCntys` | probDivCntys | This states that the build's fact map offers no value. It says nothing about whether the f |
| knownRequiredFieldsMissing | `arrest1Dt` | arrest1Dt | This states that the build's fact map offers no value. It says nothing about whether the f |

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8a-nj-disorderly-persons/**`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-all50/overlays/census-v1/**/ca-17b-reduction-set*`
- `data/rcap-all50/overlays/census-v1/**/ca-1203-43-set*`
- `data/rcap-all50/overlays/census-v1/**/az-marijuana-expungement-superior-court-set*`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/ — the family re-rendered with its defects closed
- data/rcap-grade-a/codex-cloud/r8a-nj-disorderly-persons/rows.json — one row: itemId, status, the nine counters after your change, and what you changed to close each

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family nj_disorderly_persons-set`
- `node scripts/verify-packet-build-environment.mjs --family nj_disorderly_persons-set --codex-cloud --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3`

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
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 15/15
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family is a repaired family. It is not verified, not approved and not sellable.
