# VTR03_VT_RERENDER

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** packet-repair  ·  **Sequence:** 2
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `1d88410129d4f2240bb6dbd242e63884fe01e7e2`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER.**

> **Do not start until Captain has integrated VTR01 and VTR02 and published a base carrying both. Re-rendering on the old host reproduces the same three failures.**

## Claim before you read

```sh
node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR03_VT_RERENDER <familyId>
```

Assert every family through `node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR03_VT_RERENDER <familyId>` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family vt_seal_felony-set --codex-cloud --minimum-captain-sha 1d88410129d4f2240bb6dbd242e63884fe01e7e2
```

It must report every applicable check passing and **0 failed**.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Re-render the four Vermont pathway families on the corrected host and the sourced facts, and confirm each returns all nine completeness counters at zero.

> **vt_seal_pardon-set is deliberately absent. It is a counsel question, not a re-render.**

## Rastering

Page rasters go through scripts/lib/pdf-page-raster.mjs, which discovers its browser. NEVER `pdftoppm`, NEVER `apt-get`, NEVER `playwright install`. The preflight now gates on this, so a lane that cannot raster learns before it builds.

## The 4 item(s)

- `vt_seal_felony-set`
- `vt_seal_misdemeanor-set`
- `vt_seal_dui-set`
- `vt_seal_18_to_21-set`

**Runs after:** VTR01_VT_FILING_DESTINATION_HOST, VTR02_VT_FEE_AND_SERVICE_SOURCE.

## Owned paths — write only here

- `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/**`
- `data/rcap-grade-a/codex-cloud/vtr03-vt-rerender/**`

_scripts/build-census-v1-vt_seal_misdemeanor-set.mjs is VTR01's. Two lanes editing it would be two writers on one script._

## Never write here

- `scripts/build-census-v1-vt_seal_misdemeanor-set.mjs`
- `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/**`
- `scripts/rcap-packet-completeness/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/ — re-rendered
- data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/ — re-rendered
- data/rcap-grade-a/codex-cloud/vtr03-vt-rerender/rows.json — one row per family with the nine counters after

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_felony-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_misdemeanor-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_dui-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_18_to_21-set`

## Stop conditions

- LANE STOP — you do not edit scripts/build-census-v1-vt_seal_misdemeanor-set.mjs.
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
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family must be verified again, by a lane that neither built nor repaired it.
