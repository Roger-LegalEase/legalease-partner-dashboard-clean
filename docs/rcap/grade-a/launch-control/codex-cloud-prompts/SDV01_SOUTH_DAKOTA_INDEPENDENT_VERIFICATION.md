# SDV01_SOUTH_DAKOTA_INDEPENDENT_VERIFICATION

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-verification
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `0b89b1bf6b0b211ca73784724b1e0aea409010a3`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> **This shard may not be run by the worker that ran the South Dakota repair. The repairer chose the disposition; a lane agreeing with itself has established nothing.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family sd_arrest_expungement-set \
  --codex-cloud \
  --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**.


## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Verify independently that sd_arrest_expungement-set is complete, and that the nine mailing-field reclassifications are honest rather than convenient.

## What the repair did, and what you must decide

All nine statement-of-mailing fields were **RECLASSIFIED** away from `REQUIRED_BEFORE_FILING`. None was disclosed.

**A statement of mailing is completed at or after mailing. The repair reclassified all nine rather than disclosing any. Verify that each reclassification is right for the field it names, and that no field the participant genuinely must supply before filing was reclassified to make a counter go to zero.**

Counters now: `{"knownRequiredFieldsMissing":0,"requiredFactsNotCollected":0,"unclassifiedBlanks":0,"incompleteRows":0,"requiredOptionsMissing":0,"requiredComponentsMissing":0,"invisibleWrites":0,"protectedWrites":0,"visualDefects":0}`  ·  written 67/222

## Proof obligations — measure each

- ROUTE IDENTITY: the packet is built for the route the record names, and for no other
- SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes rather than read from the receipt
- COMPONENT SET: every component the route names is rendered and present in the packet
- KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to
- REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file
- ROUTE OPTIONS: every route-determined election is selected
- REPEATING ROWS: no row carries written cells beside required cells left blank
- PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink
- ARTIFACTS: canonical and boundary bytes hash to what reports/rendered-artifacts.json names
- PAGE ORDER: the rendered page order matches the packet manifest
- CLIPPING AND OVERLAP: no ink outside a measured write box
- FILING DESTINATION: the instructions name the court or agency the route names
- FEE AND WAIVER: the fee and any waiver route are stated
- SERVICE: who must be served, and how
- SELF-HELP STOP: the packet states where self-help ends
- RECLASSIFICATION: each of the nine statement-of-mailing fields carries a disposition that is true of that field, not one chosen to zero a counter

## Verdicts

- `PASS_COMPLETE_INDEPENDENT`
- `FAIL_REPAIR_REQUIRED`
- `BLOCKED_SOURCE`
- `BLOCKED_LEGAL_INPUT`

Exactly one of PASS_COMPLETE_INDEPENDENT, FAIL_REPAIR_REQUIRED, BLOCKED_SOURCE, BLOCKED_LEGAL_INPUT. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read from the repairer's report.

**You did not repair this family and you may not repair it. A defect you find is a verdict, never an edit.**

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/rows.json — one row: itemId, verdict, the sixteen proof obligations as you measured them, and the evidence read

### Output schema

Array key `rows`, item key `itemId`, status words: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

An unrecognised verdict is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family sd_arrest_expungement-set`
- `node scripts/verify-packet-build-environment.mjs --family sd_arrest_expungement-set --codex-cloud --minimum-captain-sha 0b89b1bf6b0b211ca73784724b1e0aea409010a3`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you write into no overlay directory and no build script.
- ROW STOP — a reclassification you judge wrong is FAIL_REPAIR_REQUIRED naming the field and what the disposition should be, never a silent PASS.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
VERDICT:
RECLASSIFICATIONS UPHELD:
RECLASSIFICATIONS DISPUTED:
OVERLAY DIRECTORIES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

An independent PASS proves a packet is complete. It approves no output and opens no commercial route.
