# WARV02_WA_REVERIFICATION

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-verification  ·  **Sequence:** 3
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

> ## DO NOT LAUNCH YET. Captain creates this assignment from a new HEAD once the matching WAR re-render checkpoint is integrated. A verifier started before the repaired packet exists in its checkout verifies the artifact it was supposed to replace.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family wa_vac_substance_use_disorder-set --codex-cloud --minimum-captain-sha 72f99073c42bd28e3469efe316378b37601717c7
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

Verify independently that 4 repaired Washington families are complete, including the two obligations that failed the first time.

## Proof obligations

- FEE AND WAIVER: the instructions state the fee and any waiver route, or name it as a required-before-filing item with the office to ask — not 'confirm locally'
- SERVICE: the instructions identify who must be served and how, on the same terms
- every other obligation in the standard fifteen

## Independence

**Neither the builder nor the repairer nor the shard that failed it the first time. A verifier who already formed a view of these packets is not a fresh reading of them.** May not be run by: P2_WASHINGTON — the builder that rendered these packets, WAR04_WA_RERENDER_2, P2V02 — the shard that failed them the first time, any PF or FIX lane in this dispatch.

**Runs after:** WAR04_WA_RERENDER_2.

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/warv02-wa-reverification/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/warv02-wa-reverification/rows.json — one row per family: itemId, verdict, the obligations as you measured them

### Output schema

Array key `rows`, item key `itemId`, status words: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_substance_use_disorder-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_survivor_felony-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_survivor_misdemeanor-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family wa_vac_treaty_fishing-set`

## Stop conditions

- LANE STOP — you write into no overlay directory and no build script.
- ROW STOP — an instruction that still says only 'confirm local requirements' is FAIL_REPAIR_REQUIRED, however many counters are zero.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
PASS_COMPLETE_INDEPENDENT:
FAIL_REPAIR_REQUIRED:
OVERLAY DIRECTORIES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

An independent PASS proves a packet is complete. It approves no output and opens no route.
