# WAR02_WA_FEE_AND_SERVICE_SOURCE

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm  ·  **Sequence:** 1
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
node scripts/verify-packet-build-environment.mjs --family wa_vac_cannabis-set::filing-fee-and-waiver-route --codex-cloud --minimum-captain-sha 72f99073c42bd28e3469efe316378b37601717c7
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

Establish, from the official Washington publisher, the filing fee and waiver route and the service requirement for each of the nine vacatur routes. These are the two facts the packets are missing and the repository does not hold.

**Why a source lane:** The verifier was right to refuse to infer them and a repair lane would be equally wrong to. A fee schedule and a service rule are published facts with an issuer and a URL, which makes them a source obligation.

## The 18 facts to source

- `wa_vac_cannabis-set::filing-fee-and-waiver-route`
- `wa_vac_cannabis-set::service-recipient-and-method`
- `wa_vac_domestic_violence-set::filing-fee-and-waiver-route`
- `wa_vac_domestic_violence-set::service-recipient-and-method`
- `wa_vac_felony-set::filing-fee-and-waiver-route`
- `wa_vac_felony-set::service-recipient-and-method`
- `wa_vac_homicide_victim_prostitution-set::filing-fee-and-waiver-route`
- `wa_vac_homicide_victim_prostitution-set::service-recipient-and-method`
- `wa_vac_misdemeanor_ordinary-set::filing-fee-and-waiver-route`
- `wa_vac_misdemeanor_ordinary-set::service-recipient-and-method`
- `wa_vac_substance_use_disorder-set::filing-fee-and-waiver-route`
- `wa_vac_substance_use_disorder-set::service-recipient-and-method`
- `wa_vac_survivor_felony-set::filing-fee-and-waiver-route`
- `wa_vac_survivor_felony-set::service-recipient-and-method`
- `wa_vac_survivor_misdemeanor-set::filing-fee-and-waiver-route`
- `wa_vac_survivor_misdemeanor-set::service-recipient-and-method`
- `wa_vac_treaty_fishing-set::filing-fee-and-waiver-route`
- `wa_vac_treaty_fishing-set::service-recipient-and-method`

> This environment refuses outbound egress. Anything needing a fetch is dispatched through .github/workflows/rcap-official-source-acquisition.yml with an exact URL, never attempted locally and never faked.

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/war02-wa-fee-and-service-source/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/war02-wa-fee-and-service-source/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/war02-wa-fee-and-service-source/rows.json — one row per fact: itemId, status, the sourced value or the exact acquisition instruction
- data/rcap-grade-a/source-acquisition/packet-factory-24h/war02-wa-fee-and-service-source/receipts.json — the seven recorded fields per resolved fact; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

## Stop conditions

- NEVER state a fee or a service rule you have not sourced. An unsourced number in a filing instruction is worse than an absent one, because the participant will act on it.
- NEVER accept an unofficial mirror or a summary site. The court's own publication or nothing.
- LANE STOP — you write no packet and no build script.
- ROW STOP — a fact that cannot be sourced is STOPPED naming the exact office and URL that would publish it.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FACTS SOURCED:
FACTS STOPPED:
UNSOURCED VALUES WRITTEN: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A sourced fee is a sourced fee. It writes no packet and proves none.
