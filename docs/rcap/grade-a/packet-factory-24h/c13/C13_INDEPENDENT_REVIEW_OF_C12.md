# C13_INDEPENDENT_REVIEW_OF_C12

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-review
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work`
**Minimum required ancestor:** `a0113be04abf940895fca19a78b6a9481a4e24c3`
**C12 merged at:** `1535d2037c196cb78231be2d9e3bbe4ab28bfa13`

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE ANY OTHER PROMPT IN THIS CONTAINER.**

## Why you and not Captain

The rule that a builder may not verify its own packets is not narrower for infrastructure than for filings. Every check here was written by someone who believed it worked.

C12 was written by:

- a Codex Cloud worker — the original READY_TO_RUN workflow, the materializer, the conveyor executability
- Captain — the fetch-depth fix, the artifact-name derivation, the receipt provenance, the batch verdict, the eight handoff mutations, the claim ledger, the raster resolver and the preflight arithmetic

**May not be run by:** Captain, the author of PR #159, any lane that consumed the gate as a dependency.

## Scope

This is a **review — read, reproduce, attempt to break, report**.

It is **not** a rewrite. Change no gate, no verifier and no generator. A reviewer who edits the thing under review has stopped reviewing it.

### Files under review

- `.github/workflows/rcap-source-conveyor-ready.yml`
- `.github/workflows/rcap-official-source-acquisition-batch.yml`
- `scripts/rcap-plan-source-acquisition-batch.mjs`
- `scripts/rcap-acquire-official-source.mjs`
- `scripts/rcap-summarize-source-acquisition-batch.mjs`
- `scripts/rcap-materialize-acquisition-handoff.mjs`
- `scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs`
- `scripts/grade-a-packet-factory-24h/claim.mjs`
- `scripts/grade-a-packet-factory-24h/preflight-denominator.mjs`
- `scripts/lib/pdf-page-raster.mjs`
- `scripts/verify-packet-build-environment.mjs`

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs --codex-cloud --minimum-captain-sha a0113be04abf940895fca19a78b6a9481a4e24c3
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

## Method

- Reproduce first: run every check and mutation suite and record the output before forming any view.
- Then attack: for each question, construct the case rather than looking for one. A negative test whose subject cannot exist proves nothing.
- Record what you could NOT break as carefully as what you could. A check you attacked and failed to break is evidence the check is sound.

## The questions

### Q1 — the gate's own honesty

READY_TO_RUN runs generators in --check mode, two verifiers with mutations, and a clean-worktree proof. Find a change to the dispatch that READY_TO_RUN would pass and that a careful human would reject.

**Why it matters:** A gate is only worth its narrowest hole. I wrote it expecting it to hold; that is exactly the belief a reviewer should attack.

_Report as: a concrete diff that passes the gate and should not._

### Q2 — vacuous checks

Across verify.mjs (26 checks), verify-source-conveyor.mjs (20) and verify-acq-promo-handoff.mjs (3), find any check that would still pass if the thing it protects were deleted. Prove each one by deleting the subject and running the check.

**Why it matters:** Two checks in this repository have already been found vacuous — F26 passed when every legal finding was removed, and the preflight counted not-applicable checks as passes. Both were caught by a mutation, not by reading. Assume more remain.

_Report as: check id, what you deleted, and the output showing it still passed._

### Q3 — the ACQ to PROMO chain

The planner derives one artifact name, the workflow passes it and the run id, the acquisition script records both, upload-artifact uses the name, the materializer compares both. Find any path where a receipt reaches PROMO whose bytes are not the bytes that receipt describes.

**Why it matters:** The materializer refused everything for weeks because nothing wrote the fields it compared, and nobody noticed, because a gate that refuses everything looks exactly like one that works.

_Report as: the exact sequence of steps that produces the mismatch._

### Q4 — the claim ledger

Atomicity is claimed to come from a single writer rather than run-time contention. Test that claim: find a sequence of integrations after which two lanes hold one family for the same kind of work, or a lane asserts a grant that Captain has since revoked.

**Why it matters:** The honest version of this mechanism says workers assert grants and never acquire them. If that is wrong, the word 'atomic' in the ledger is doing work it has not earned.

_Report as: the integration sequence and the resulting ledger state._

### Q5 — the raster path

resolveChromium tries an override, then the PLAYWRIGHT_BROWSERS_PATH layout, then Playwright's resolver. Find an environment where it resolves a browser that cannot actually render, or where the preflight passes and a build still fails on rastering.

**Why it matters:** Four lanes returned STOPPED on this and the preflight said 14/14 the whole time. The fix may have moved the failure rather than removed it.

_Report as: the environment and the observed failure._

### Q6 — what the gate does not ask

Name the checks that SHOULD be in READY_TO_RUN and are not. Be specific about what each would catch.

**Why it matters:** The most expensive defects this sprint were all things nothing was looking for: an unwritten claim ledger, a hardcoded browser path, thirteen legally blocked families in build lanes, a receipt field nothing populated.

_Report as: proposed check, what it catches, and why the existing set misses it._

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/c13-independent-review/**`

## Never write here

- `.github/workflows/**`
- `scripts/**`
- `data/rcap-grade-a/packet-factory-24h/**`
- `data/rcap-all50/**`
- `docs/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/c13-independent-review/findings.json — one row per finding: question id, severity, file:line, the claim, the reproduction, and the suggested fix
- data/rcap-grade-a/codex-cloud/c13-independent-review/reproduction.json — the output of every check and mutation suite as you observed it, before any attack
- data/rcap-grade-a/codex-cloud/c13-independent-review/couldNotBreak.json — every attack you attempted that failed, and why

### Output schema

Array key `findings`, item key `id`, verdicts: `CONFIRMED`, `PLAUSIBLE`, `COULD_NOT_BREAK`.

## Reproduce these first

- `node scripts/grade-a-packet-factory-24h/verify.mjs --mutations`
- `node scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs --mutations`
- `node scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs --mutations`
- `node scripts/grade-a-packet-factory-24h/generate.mjs --check`

## Stop conditions

- LANE STOP — you change no gate, no verifier, no generator and no queue record. Your diff touches only your own return directory.
- NEVER report a finding you did not reproduce. A suspicion is not a finding, and saying so is a complete return.
- NEVER open a commercial route, touch Production, or commit a source body.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface.

```text
ASSIGNMENT: C13_INDEPENDENT_REVIEW_OF_C12
BASE SHA:
COMMIT:
CHECKS REPRODUCED:
FINDINGS CONFIRMED:
ATTACKS THAT FAILED:
GATES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A clean review is a clean review. It approves no packet, promotes no route and does not make the gate correct — it makes one more person's failure to break it part of the record.
