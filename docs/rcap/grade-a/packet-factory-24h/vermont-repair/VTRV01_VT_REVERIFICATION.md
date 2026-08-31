# VTRV01_VT_REVERIFICATION

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-verification  ·  **Sequence:** 3
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `ab5c3ab2620ddc7283eb18223f6226bc12e0e05d`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER.**

> ## DO NOT LAUNCH YET. Captain creates this assignment from a new HEAD once VTR03 is integrated. A verifier started before the repaired packet exists in its checkout verifies the artifact it was supposed to replace.

## Claim before you read

```sh
node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTRV01_VT_REVERIFICATION <familyId>
```

Assert every family through `node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTRV01_VT_REVERIFICATION <familyId>` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.

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

Verify independently that the four repaired Vermont pathway families are complete, including the three obligations that failed the first time.

## The 4 item(s)

- `vt_seal_felony-set`
- `vt_seal_misdemeanor-set`
- `vt_seal_dui-set`
- `vt_seal_18_to_21-set`

## Proof obligations

- FILING DESTINATION: the instructions name the court the petition goes to
- FEE AND WAIVER: the fee and any waiver route are stated, or named as a required-before-filing item with the office to ask — not 'confirm locally'
- SERVICE: who must be served and how, on the same terms
- every other obligation in the standard set

## Independence

**Neither the builder, nor the repairer, nor a shard that already formed a view of these packets.** May not be run by: the builder of these packets, VTR01_VT_FILING_DESTINATION_HOST, VTR03_VT_RERENDER, VF01, VF02, VF11, VF12.

**Runs after:** VTR03_VT_RERENDER.

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/vtrv01-vt-reverification/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/vt/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/vtrv01-vt-reverification/rows.json

### Output schema

Array key `rows`, item key `itemId`, status words: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_felony-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_misdemeanor-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_dui-set`
- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family vt_seal_18_to_21-set`

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
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

An independent PASS proves a packet is complete. It approves no output and opens no route.
