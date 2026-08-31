# R8D_AZ_MARIJUANA_SUPERIOR_COURT

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
  --family az_marijuana_expungement_superior_court-set \
  --codex-cloud \
  --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**.
 Captain ran exactly this for this family and observed `PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`, so a different answer is a change in the container, not in the dispatch.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Repair az_marijuana_expungement_superior_court-set until all nine completeness counters are zero. One family, its own lane, its own stop conditions.

## The exact defect — FAIL_MISSING_REQUIRED_FACTS

Written 14/50. Nonzero counters:

- `knownRequiredFieldsMissing` — 5
- `unclassifiedBlanks` — 1
- `requiredOptionsMissing` — 19
- `requiredComponentsMissing` — 1

Blank dispositions now: `{"NOT_APPLICABLE_ON_THIS_ROUTE":6,"KNOWN_FACT_NOT_WRITTEN":5,"LATER_COMPLETION":1,"UNCLASSIFIED_BLANK":1,"OPTIONAL_PARTICIPANT_CONTENT":2,"PROTECTED_FIELD":2,"ROUTE_OPTION_NOT_SELECTED":19}`

### The first 26 of 26 findings

| Counter | Field | Label | Why |
| --- | --- | --- | --- |
| knownRequiredFieldsMissing | `citing-or-arresting-agency` | Name of citing or arresting law enforcement agen | A statement of build policy. A case fact does not stop being required because the build de |
| unclassifiedBlanks | `justice-court-name` | If Yes, insert name of Justice Court here | Conditional on an unanswered Yes/No election and asks for a court identity; never prefille |
| knownRequiredFieldsMissing | `justice-court-case-number` | Justice Court case number here | a required known fact with no approved reason for being blank |
| knownRequiredFieldsMissing | `prosecuting-agency` | Name of prosecuting agency | A statement of build policy. A case fact does not stop being required because the build de |
| knownRequiredFieldsMissing | `conditional-conviction-date` | If Yes, insert date of conviction here | a required known fact with no approved reason for being blank |
| knownRequiredFieldsMissing | `conditional-dismissal-date` | If Yes, insert date of dismissal here | a required known fact with no approved reason for being blank |
| requiredOptionsMissing | `—` | [ ] Possessing, consuming, or transporting two a | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | [ ] Possessing, transporting, cultivating, or pr | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | [ ] Possessing, using, or transporting paraphern | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 2. My court case began in a Justice Court [ ] Ye | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 2. My court case began in a Justice Court [ ] Ye | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 4. I was convicted of the offense [ ] Yes [ ] No | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 4. I was convicted of the offense [ ] Yes [ ] No | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 5. One or more non-eligible charges were filed a | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 5. One or more non-eligible charges were filed a | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 6. My sentence included a term of probation [ ]  | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 6. My sentence included a term of probation [ ]  | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 7. My case was dismissed [ ] Yes [ ] No. If Yes, | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 7. My case was dismissed [ ] Yes [ ] No. If Yes, | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 8. There is an outstanding arrest warrant in thi | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 8. There is an outstanding arrest warrant in thi | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 9. There is an active payment plan on my case [  | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | 9. There is an active payment plan on my case [  | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | hereby request a hearing [ ] Yes [ ] No. | A shared limitation, not a determination that this election belongs to the participant. |
| requiredOptionsMissing | `—` | hereby request a hearing [ ] Yes [ ] No. | A shared limitation, not a determination that this election belongs to the participant. |
| requiredComponentsMissing | `—` | — | the field map or source receipt names this document as part of the packet, and it appears  |

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8d-az-marijuana-superior-court/**`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-all50/overlays/census-v1/**/nj-disorderly-persons-set*`
- `data/rcap-all50/overlays/census-v1/**/ca-17b-reduction-set*`
- `data/rcap-all50/overlays/census-v1/**/ca-1203-43-set*`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/ — the family re-rendered with its defects closed
- data/rcap-grade-a/codex-cloud/r8d-az-marijuana-superior-court/rows.json — one row: itemId, status, the nine counters after your change, and what you changed to close each

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family az_marijuana_expungement_superior_court-set`
- `node scripts/verify-packet-build-environment.mjs --family az_marijuana_expungement_superior_court-set --codex-cloud --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3`

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
