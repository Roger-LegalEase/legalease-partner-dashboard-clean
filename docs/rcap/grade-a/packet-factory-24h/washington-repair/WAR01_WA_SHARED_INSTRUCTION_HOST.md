# WAR01_WA_SHARED_INSTRUCTION_HOST

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** shared-host-repair  ·  **Sequence:** 1
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it.
**Minimum required ancestor:** `72f99073c42bd28e3469efe316378b37601717c7`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## RETIRED — DO NOT RUN
>
> **This lane was never executed and no longer owns anything.** It does not mean a defect is fixed or a held family is approved. Current legal and product-path holds remain outside this historical packet-repair dispatch, with their state and execution owner recorded separately from settled families.
>
> The prompt is kept because its reading of the defect is still the best one on record. Read it; do not run it as written.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER WASHINGTON REPAIR PROMPTS IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family wa_vac_cannabis-set --codex-cloud --minimum-captain-sha 72f99073c42bd28e3469efe316378b37601717c7
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Correct the one host that writes the participant instructions for all nine Washington vacatur families, so it states the fee, the waiver route, the service recipient and the service method from route data — or names them as required-before-filing items the participant must obtain, with who to ask. It must never say 'confirm local requirements' and stop there.

**Why one lane:** All nine families import build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs and all nine fail the same two obligations. One shared host has one owner; nine lanes editing one file is nine writers on one script.

## The defect, in the verifiers' words

Failed obligations: `feeAndWaiver`, `service` — on **all nine families**.

- **Observed:** Instructions say only to confirm local fee and service requirements.
- **Expected:** The fee and any waiver route stated, and the service recipient and method identified — or each named as a required-before-filing item with the office to ask.

| Family | Shard | Evidence |
| --- | --- | --- |
| `wa_vac_cannabis-set` | P2V01 | `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/repair-assignments.json` |
| `wa_vac_domestic_violence-set` | P2V01 | `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/repair-assignments.json` |
| `wa_vac_felony-set` | P2V01 | `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/repair-assignments.json` |
| `wa_vac_homicide_victim_prostitution-set` | P2V02 | `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/repair-assignments.json` |
| `wa_vac_misdemeanor_ordinary-set` | P2V02 | `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/repair-assignments.json` |
| `wa_vac_substance_use_disorder-set` | P2V02 | `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/repair-assignments.json` |
| `wa_vac_survivor_felony-set` | P2V03 | `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/repair-assignments.json` |
| `wa_vac_survivor_misdemeanor-set` | P2V03 | `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/repair-assignments.json` |
| `wa_vac_treaty_fishing-set` | P2V03 | `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/repair-assignments.json` |

## The hard part

**The census carries the destination court for each route and carries no fee schedule, no waiver route and no service list. You may not invent them. Where WAR02 has supplied a sourced fact, write it; where it has not, emit an explicit required-before-filing item naming the exact office the participant must ask. A vague instruction and an invented one are both failures; only the named question is honest.**

## Owned paths — write only here

- `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs`
- `data/rcap-grade-a/codex-cloud/war01-wa-shared-instruction-host/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs — the corrected instruction assembler
- data/rcap-grade-a/codex-cloud/war01-wa-shared-instruction-host/rows.json — one row per obligation corrected, and the nine families it reaches

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/verify-packet-build-environment.mjs --family wa_vac_cannabis-set --codex-cloud --minimum-captain-sha 72f99073c42bd28e3469efe316378b37601717c7`

## Stop conditions

- LANE STOP — you render no packet and you write into no overlay directory. Re-rendering is WAR03 and WAR04.
- NEVER invent a fee, a waiver route, a service recipient or a service method. A fact the repository does not hold is a required-before-filing item naming who to ask.
- ROW STOP — an obligation you cannot emit honestly from route data is STOPPED naming exactly what is missing.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
OBLIGATIONS CORRECTED:
FACTS INVENTED: 0
PACKETS RENDERED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A corrected host is corrected logic. It renders no packet and proves none.
