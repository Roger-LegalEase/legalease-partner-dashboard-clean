# P2V01_WASHINGTON_INDEPENDENT_VERIFICATION

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-verification
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `49dfa403a4185542c494d7ef53ae015931402e43`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> **This shard may not be run by a worker that ran codex/p2-wa-vacatur-completeness. The builder measured its own nine counters with the code that decided what to write; a lane agreeing with itself has established nothing.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family wa_vac_cannabis-set \
  --codex-cloud \
  --minimum-captain-sha 49dfa403a4185542c494d7ef53ae015931402e43
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**. A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git clone`
- `git remote add`

## Mission

Verify independently that each of these 3 Washington vacatur packets is complete. The completeness audit reports all nine counters at zero; you are asked whether that is true of the artifact, not whether the report says so.

## The 3 families

| Family | Audit result | Written | Overlay directory |
| --- | --- | --- | --- |
| `wa_vac_cannabis-set` | PASS_COMPLETE | 29/51 | `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill` |
| `wa_vac_domestic_violence-set` | PASS_COMPLETE | 28/71 | `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill` |
| `wa_vac_felony-set` | PASS_COMPLETE | 49/82 | `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill` |

_The audit reports all nine counters at zero on each. Your job is to find out whether that is true of the artifact._

## Proof obligations — measure each, per family

- ROUTE IDENTITY: the packet is built for the route the record names, and for no other
- SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes rather than read from the receipt
- COMPONENT SET: every component the route names is rendered and present in the packet
- KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to
- REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file
- ROUTE OPTIONS: every route-determined election is selected — a packet built for one vacatur route states which
- REPEATING ROWS: no row carries written cells beside required cells left blank
- PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink
- ARTIFACTS: canonical and boundary bytes hash to what reports/rendered-artifacts.json names
- PAGE ORDER: the rendered page order matches the packet manifest
- CLIPPING AND OVERLAP: no ink outside a measured write box
- FILING DESTINATION: the instructions name the court the route names
- FEE AND WAIVER: the fee and any waiver route are stated
- SERVICE: who must be served, and how
- SELF-HELP STOP: the packet states where self-help ends

## Verdicts

- `PASS_COMPLETE_INDEPENDENT`
- `FAIL_REPAIR_REQUIRED`
- `BLOCKED_SOURCE`
- `BLOCKED_LEGAL_INPUT`

Exactly one of PASS_COMPLETE_INDEPENDENT, FAIL_REPAIR_REQUIRED, BLOCKED_SOURCE, BLOCKED_LEGAL_INPUT per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here from the field map and the rendered bytes rather than read from the builder's report.

**You did not build these families and you may not repair them. A defect you find is a verdict and a repair assignment, never an edit.**

## Owned paths — write only here

- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/rows.json — one row per family: itemId, verdict, the fifteen proof obligations as you measured them, and the evidence read
- data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect and the exact failed proof obligations

### Output schema

Array key `rows`, item key `itemId`, verdicts: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

An unrecognised verdict is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>`
- `node scripts/verify-packet-build-environment.mjs --family <familyId> --codex-cloud --minimum-captain-sha 49dfa403a4185542c494d7ef53ae015931402e43`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you write into no overlay directory and no build script. Verification that edits what it verifies is not verification.
- ROW STOP — a counter you cannot reproduce is FAIL_REPAIR_REQUIRED naming the counter and the rows that make it nonzero, never a silent agreement with the audit.
- ROW STOP — a family blocked by its source is BLOCKED_SOURCE and one blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS.
- NEVER open a commercial route and never touch Production.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES VERIFIED:
PASS_COMPLETE_INDEPENDENT:
FAIL_REPAIR_REQUIRED:
BLOCKED_SOURCE:
BLOCKED_LEGAL_INPUT:
OVERLAY DIRECTORIES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

An independent PASS proves a packet is complete. It approves no output, proves no fulfillment authority and opens no commercial route.
