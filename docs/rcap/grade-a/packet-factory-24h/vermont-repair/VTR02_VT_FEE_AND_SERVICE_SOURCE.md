# VTR02_VT_FEE_AND_SERVICE_SOURCE

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm  ·  **Sequence:** 1
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `3eeae7890f60aee3b31bad94ab475a496f3a7b7c`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER.**

## Claim before you read

```sh
node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR02_VT_FEE_AND_SERVICE_SOURCE <familyId>
```

Assert every family through `node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR02_VT_FEE_AND_SERVICE_SOURCE <familyId>` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family vt_seal_felony-set::filing-fee-and-waiver-route --codex-cloud --minimum-captain-sha 3eeae7890f60aee3b31bad94ab475a496f3a7b7c
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

Establish, from the Vermont Judiciary's own publication, the filing fee and any waiver route for a sealing petition under 13 V.S.A. § 7602, and the service requirement — who must be served and how — for the petition and the stipulation.

**Why a source lane:** VF03 said it in its own repairScope: do not infer these from a verifier's finding. A fee schedule and a service rule are published facts with an issuer and a URL. Writing an unsourced fee into a filing instruction is worse than leaving it out, because the participant will act on it.

## The 8 facts to source

- `vt_seal_felony-set::filing-fee-and-waiver-route`
- `vt_seal_felony-set::service-recipient-and-method`
- `vt_seal_misdemeanor-set::filing-fee-and-waiver-route`
- `vt_seal_misdemeanor-set::service-recipient-and-method`
- `vt_seal_dui-set::filing-fee-and-waiver-route`
- `vt_seal_dui-set::service-recipient-and-method`
- `vt_seal_18_to_21-set::filing-fee-and-waiver-route`
- `vt_seal_18_to_21-set::service-recipient-and-method`

> This environment refuses outbound egress. Anything needing a fetch is dispatched through .github/workflows/rcap-official-source-acquisition-batch.yml with an exact URL, never attempted locally and never faked.

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/vtr02-vt-fee-and-service-source/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/vtr02-vt-fee-and-service-source/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/vt/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/vtr02-vt-fee-and-service-source/rows.json — one row per fact
- data/rcap-grade-a/source-acquisition/packet-factory-24h/vtr02-vt-fee-and-service-source/receipts.json — the seven recorded fields per resolved fact; no body committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

## Stop conditions

- NEVER state a fee or a service rule you have not sourced.
- NEVER accept an unofficial mirror or a summary site. The judiciary's own publication or nothing.
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
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A sourced fee is a sourced fee. It writes no packet and proves none.
