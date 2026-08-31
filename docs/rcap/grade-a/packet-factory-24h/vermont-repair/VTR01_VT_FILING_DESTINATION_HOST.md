# VTR01_VT_FILING_DESTINATION_HOST

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** shared-host-repair  ·  **Sequence:** 1
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `ab5c3ab2620ddc7283eb18223f6226bc12e0e05d`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER.**

## Claim before you read

```sh
node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR01_VT_FILING_DESTINATION_HOST <familyId>
```

Assert every family through `node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTR01_VT_FILING_DESTINATION_HOST <familyId>` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family vt_seal_felony-set --codex-cloud --minimum-captain-sha ab5c3ab2620ddc7283eb18223f6226bc12e0e05d
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

Correct the one host that writes participant instructions for the Vermont sealing families so the instructions state where the petition is filed. The destination is on the documents' own face and the instructions never said it.

**Why one lane:** All five Vermont families are rendered by build-census-v1-vt_seal_misdemeanor-set.mjs; four sibling entry points import it. One shared host has one writer.

## The defect

Obligation: `filingDestination`

- **Observed:** The instructions tell the participant to file and never say where.
- **Expected:** The Superior Court Criminal Division, in the unit where the case was decided — which both 200-00130 and 200-00132 print on their own caption, and whose Unit selector is already disclosed as a required-before-filing item.

_The fact is on the document. Nothing has to be acquired to say it._

## You may not

- state a filing fee, a waiver route, a service recipient or a service method — those are VTR02's and are not in this repository
- render any packet — re-rendering is VTR03
- touch data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill or anything else about the pardon route

## Owned paths — write only here

- `scripts/build-census-v1-vt_seal_misdemeanor-set.mjs`
- `data/rcap-grade-a/codex-cloud/vtr01-vt-filing-destination-host/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/vt/**`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- scripts/build-census-v1-vt_seal_misdemeanor-set.mjs — instructions that state the filing destination
- data/rcap-grade-a/codex-cloud/vtr01-vt-filing-destination-host/rows.json

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Focused tests

- `node scripts/verify-packet-build-environment.mjs --family vt_seal_felony-set --codex-cloud --minimum-captain-sha ab5c3ab2620ddc7283eb18223f6226bc12e0e05d`

## Stop conditions

- LANE STOP — you render no packet and write into no overlay directory.
- NEVER invent a fee, a waiver route, a service recipient or a service method.
- ROW STOP — anything you cannot state from the document itself is STOPPED, naming what is missing.

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
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A corrected host is corrected logic. It renders no packet and proves none.
