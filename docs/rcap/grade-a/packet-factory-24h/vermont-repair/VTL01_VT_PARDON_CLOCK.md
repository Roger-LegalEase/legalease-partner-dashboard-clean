# VTL01_VT_PARDON_CLOCK

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** counsel-question  ·  **Sequence:** 1
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `d0c251113aa756c7e848d9afe3d9a7ca6d2dd50b`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER.**

## Claim before you read

```sh
node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTL01_VT_PARDON_CLOCK <familyId>
```

Assert every family through `node scripts/grade-a-packet-factory-24h/claim.mjs --assert VTL01_VT_PARDON_CLOCK <familyId>` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --family vt_seal_pardon-set --codex-cloud --minimum-captain-sha d0c251113aa756c7e848d9afe3d9a7ca6d2dd50b
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

Put one question to counsel: which limitation clock governs a petition to seal a PARDONED MISDEMEANOUR in Vermont — the three-year clock at 13 V.S.A. § 7602(c) or the seven-year clock at § 7602(d)?

**Why this is not a repair:** The committed treatment records this route as exact_supported_deferral and says the timing question 'decides when you may file at all'. A packet that tells a participant how to file when the law does not resolve whether they may file yet is worse than no packet. No amount of instruction editing answers it.

## The committed evidence

`data/rcap-all50/terminalization-treatments/vt.json` records `vt_seal_pardon` as **exact_supported_deferral**:

> You file the sealing petition yourself in the Criminal Division and the mechanism is in scope, but the statute does not resolve whether a pardoned misdemeanour runs on the three-year clock at § 7602(c) or the seven-year clock at § 7602(d), and that timing question decides when you may file at all.

## What Captain got wrong

The master queue carries this family as legalInputStatus SETTLED while its own treatment record says deferral, and this builder rendered it as a filing-ready packet identical to the other four but for three lines of route name. Both are Captain-side and are corrected with this dispatch.

**What happens to the packet:** vt_seal_pardon-set leaves the build and verification queues until counsel answers. Its rendered artifacts are preserved as review evidence and are not participant-deliverable.

## The 1 item(s)

- `vt_seal_pardon-set`

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/vtl01-vt-pardon-clock/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/vt/**`
- `scripts/build-census-v1-*.mjs`

## Required outputs

- data/rcap-grade-a/codex-cloud/vtl01-vt-pardon-clock/question.json — the question, the statutory text on both sides, and what turns on the answer

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

## Stop conditions

- NEVER answer the question yourself. You state it, with the text on both sides, and stop.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
QUESTION STATED: 1
ANSWERS INVENTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A stated question is a stated question. It settles nothing and authorizes no packet.
