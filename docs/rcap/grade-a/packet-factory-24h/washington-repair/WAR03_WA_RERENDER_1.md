# WAR03_WA_RERENDER_1

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** packet-repair  ·  **Sequence:** 2
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

> **Do not start until Captain has integrated WAR01 and WAR02 and published a base that carries both. Re-rendering on the old host reproduces the same two failures.**

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

Re-render 5 Washington vacatur families on the corrected host and the sourced facts, and confirm each returns all nine completeness counters at zero.

## The 5 families

| Family | Failed | Reproduce |
| --- | --- | --- |
| `wa_vac_cannabis-set` | feeAndWaiver, service | `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_cannabis-set` |
| `wa_vac_domestic_violence-set` | feeAndWaiver, service | `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_domestic_violence-set` |
| `wa_vac_felony-set` | feeAndWaiver, service | `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_felony-set` |
| `wa_vac_homicide_victim_prostitution-set` | feeAndWaiver, service | `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_homicide_victim_prostitution-set` |
| `wa_vac_misdemeanor_ordinary-set` | feeAndWaiver, service | `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_misdemeanor_ordinary-set` |

**Runs after:** WAR01_WA_SHARED_INSTRUCTION_HOST, WAR02_WA_FEE_AND_SERVICE_SOURCE.

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/**`
- `data/rcap-grade-a/codex-cloud/war03-wa-rerender-1/**`

_scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs is WAR01's. Two re-render lanes editing it would be two writers on one script._

## Never write here

- `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/ — re-rendered
- data/rcap-grade-a/codex-cloud/war03-wa-rerender-1/rows.json — one row per family: itemId, status, the nine counters after

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_cannabis-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_domestic_violence-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_felony-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_homicide_victim_prostitution-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_misdemeanor_ordinary-set`

## Stop conditions

- LANE STOP — you do not edit scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs.
- ROW STOP — a family whose instructions still lack a sourced fee or service rule is STOPPED naming which, and the lane continues to the next family.
- NEVER invent a fact and never write a protected field.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES ASSIGNED:
ROWS RETURNED (must equal FAMILIES ASSIGNED):
FAMILIES COMPLETED:
FAMILIES STOPPED:
NINE COUNTERS ZERO ON:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family must be verified again, by a lane that neither built nor repaired it.
