# SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR__CODEX_CLOUD

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** completeness-repair
**Branch:** `work` — Codex Cloud names the branch. Do not rename it, and do not create another.
**Minimum Captain SHA:** `98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`
**Continues:** P4_NE_SD_SETASIDE_COMPLETENESS (data/rcap-grade-a/launch-control/S2_CONTINUATION.json)
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

It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**. 14/14 or stop. Three Codespaces checks are replaced by cloud-native ones, not waived, so a 13/14 in cloud mode is a real failure and not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `git remote add`
- `git clone`
- `git fetch --unshallow`

> Codex Cloud checks the selected Captain branch out as a local branch named `work`, shallow, and removes origin before the agent starts. Every one of those commands fails on a checkout that is working exactly as designed, and the failure looks like a broken environment rather than a wrong instruction.

## Mission

Close the one defect standing between sd_arrest_expungement-set and a complete packet: nine fields declared required before filing that the packet never asks the participant for. Change nothing else about this family and nothing at all about any other.

The S2 continuation left ten of eleven families complete. This is the eleventh, and its defect is one thing: nine fields are declared required before filing and the packet never asks the participant for them.

## The exact defect — 0 field(s)

Each row declares requiredBeforeFiling and none is named in the packet's participant-instructions.md. A blank is permitted as required-before-filing only because the packet says so, and this packet does not say so.

| Field | Printed label |
| --- | --- |

### Two honest outcomes

- DISCLOSE — the fields really are the participant's to supply before filing, and participant-instructions.md must name each one in the participant's words.
- RECLASSIFY — a statement of mailing is completed at or after mailing, so these may not be required-before-filing at all. If that is the answer, correct the declaration in the build script and say which disposition is right.

**Pick one per field and state why. A field disclosed in the instructions AND reclassified is a packet that says two things.**

## Owned paths — write only here



## Never write here

- `scripts/rcap-packet-completeness/**`
- `scripts/build-census-v1-ne-setaside-custodial-set.mjs`
- `data/rcap-all50/overlays/census-v1/ne/**`
- `data/rcap-all50/overlays/census-v1/ut/**`
- `data/rcap-all50/overlays/census-v1/wv/**`
- `data/rcap-grade-a/launch-control/**`

## Required outputs

- data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/participant-instructions.md — naming every field you disclose, in the participant's words
- data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/ — the family re-rendered after your change
- data/rcap-grade-a/codex-cloud/sd-arrest-expungement-disclosure-repair/rows.json — one row per field: itemId, DISCLOSED or RECLASSIFIED, and why

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family sd_arrest_expungement-set`
- `node scripts/verify-packet-build-environment.mjs --family sd_arrest_expungement-set --codex-cloud --minimum-captain-sha 98a7a57e2a354eeb8b33b3873e62f7a9785fedaf`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you do not change the completeness contract. It is fixed and you read it.
- LANE STOP — one family. The other ten in the closure are complete and are not yours.
- NEVER invent a fact. An unavailable fact is required_before_filing, disclosed to the participant, never guessed.
- NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.
- ROW STOP — a field you can neither disclose honestly nor reclassify defensibly is a STOPPED row naming which it is and what is missing.

Stopping with an honest account of what is missing is a complete return.

## How you return

Commit your work locally. Leave the final diff for the Codex UI. **PUSHED: YES is not part of a cloud return. There is nothing to push to and asking for it turns a complete task into a failed one.**

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FIELDS DISCLOSED:
FIELDS RECLASSIFIED:
FIELDS STOPPED:
NINE COUNTERS ZERO: YES/NO
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A complete packet is a complete packet. It is not independently verified, not approved for output, and it opens no route.
