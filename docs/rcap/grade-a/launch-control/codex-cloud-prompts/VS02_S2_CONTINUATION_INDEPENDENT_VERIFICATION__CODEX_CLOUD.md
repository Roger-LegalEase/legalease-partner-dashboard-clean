# VS02_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** independent-verification
**Branch:** `work` — Codex Cloud names the branch. Do not rename it, and do not create another.
**Minimum Captain SHA:** `98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`
**Continues:** VS02_S2_CONTINUATION_INDEPENDENT_VERIFICATION (data/rcap-grade-a/launch-control/S2_CONTINUATION.json)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> This task runs in Codex Cloud. There is no origin, the checkout is shallow, and your finished diff returns through the Codex UI. That is the design, not a broken environment.

## Before anything else

```sh
# The setup phase already ran scripts/codex-cloud/setup-packet-factory.sh and printed
# LEGALEASE_CODEX_CLOUD_READY. Your job is to load what it left and prove the gate.
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family <FAMILY_ID> \
  --codex-cloud \
  --minimum-captain-sha 98a7a57e2a354eeb8b33b3873e62f7a9785fedaf
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing**. Every registered applicable check passing, or stop. Three Codespaces checks are replaced by cloud-native ones, not waived, so any registered applicable check failing in cloud mode is a real failure and not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `git remote add`
- `git clone`
- `git fetch --unshallow`

> Codex Cloud checks the selected Captain branch out as a local branch named `work`, shallow, and removes origin before the agent starts. Every one of those commands fails on a checkout that is working exactly as designed, and the failure looks like a broken environment rather than a wrong instruction.

## Mission

Verify independently that each family's packet is complete. The completeness audit says all nine counters are zero; you are asked whether that is true of the artifact, not whether the report says so.

## The 0 families



_Unchanged from the original dispatch. This continuation moves the environment, not the scope._

## Proof obligations

- COMPLETENESS: recompute the nine counters from the family's own field map and rendered artifacts, and say whether each is zero
- COMPLETENESS: every REQUIRED_BEFORE_FILING blank is named in participant-instructions.md, checked against the file rather than the count
- COMPLETENESS: no fact the packet writes elsewhere in the same document is refused as required-before-filing
- ARTIFACT: the canonical and boundary bytes hash to what the record names
- SOURCE: every source the receipt names is exact, by form number or content hash
- BOUNDARY: no protected field carries ink -- participant signature, signature date, certificate of mailing before mailing, court-only or prosecutor-only

## Verdicts

- `PASS_COMPLETE_INDEPENDENT`
- `FAIL_REPAIR_REQUIRED`
- `BLOCKED_SOURCE`
- `BLOCKED_LEGAL_INPUT`

**You did not build these families and you may not repair them. A defect you find is a verdict, never an edit.**

## Owned paths — write only here



## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-grade-a/codex-cloud/s2-continuation-verify-02/rows.json — one row per family: itemId, verdict, the nine counters as you measured them, and the evidence read

### Output schema

Array key `rows`, item key `itemId`, status words: `PASS_COMPLETE_INDEPENDENT`, `FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, `BLOCKED_LEGAL_INPUT`.

An unrecognised verdict is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>`
- `node scripts/verify-packet-build-environment.mjs --family <familyId> --codex-cloud --minimum-captain-sha 98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you write into no overlay directory and no build script.
- ROW STOP — a counter you cannot reproduce is a FAIL_REPAIR_REQUIRED naming the counter and the rows that make it nonzero, never a silent agreement with the audit.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit your work locally. Leave the final diff for the Codex UI. **PUSHED: YES is not part of a cloud return. There is nothing to push to and asking for it turns a complete task into a failed one.**

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES CLAIMED:
PASS_COMPLETE_INDEPENDENT:
FAIL_REPAIR_REQUIRED:
BLOCKED_SOURCE:
BLOCKED_LEGAL_INPUT:
OVERLAY DIRECTORIES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

An independent PASS proves a packet is complete. It approves no output and opens no commercial route.
