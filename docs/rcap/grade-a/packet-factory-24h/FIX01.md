# FIX01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** rapid-repair
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `40ccc028a2af8eac94743cdb32237e3af56a6642` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family az_marijuana_expungement_arrest_no_charges-set \
  --codex-cloud \
  --minimum-captain-sha 40ccc028a2af8eac94743cdb32237e3af56a6642
```

It must print **`PACKET_BUILD_ENVIRONMENT_READY: 14/14`**. A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Mission

Repair exactly the proof obligations a verifier failed, on exactly the families it failed them on. Nothing else.

## The 5 families

- `az_marijuana_expungement_arrest_no_charges-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, requiredOptionsMissing, requiredComponentsMissing
- `ca-851-91-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, incompleteRows, requiredOptionsMissing, requiredComponentsMissing
- `nj_indictable_conviction-set` — failing: knownRequiredFieldsMissing
- `pa_490_nonconviction-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, incompleteRows, requiredComponentsMissing
- `ri_nonconviction_sealing-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks

## What you receive

Only the failed families and their exact failed proof obligations.

A repair lane does not repeat broad family analysis. If the failure is not reproducible from the obligations you were given, stop and say so rather than re-deriving the family.

**After repair, the family goes to a verifier that is neither its builder nor its repairer. Captain routes it; you do not choose.**

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/fix01/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-851-91-set.mjs`
- `scripts/build-census-v1-nj_indictable_conviction-set.mjs`
- `scripts/build-census-v1-pa_490_nonconviction-set.mjs`
- `scripts/build-census-v1-ri_nonconviction_sealing-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/**`
- `scripts/build-census-v1-wa_vac_cannabis-set.mjs`
- `scripts/build-census-v1-wa_vac_domestic_violence-set.mjs`
- `scripts/build-census-v1-wa_vac_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_homicide_victim_prostitution-set.mjs`
- `scripts/build-census-v1-wa_vac_misdemeanor_ordinary-set.mjs`
- `scripts/build-census-v1-wa_vac_substance_use_disorder-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_felony-set.mjs`
- `scripts/build-census-v1-wa_vac_survivor_misdemeanor-set.mjs`
- `scripts/build-census-v1-wa_vac_treaty_fishing-set.mjs`
- `scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs`
- `data/rcap-grade-a/codex-cloud/p2-wa-vacatur-completeness/**`
- `data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/fix01/rows.json — one row per family: itemId, status, the obligation repaired, and the nine counters after

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- LANE STOP — you do not change the completeness contract.
- LANE STOP — only the families and obligations handed to you.
- ROW STOP — an obligation you cannot repair without re-deriving the family is STOPPED with what is missing.
- NEVER invent a fact and never write a protected field.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
BASE SHA:
COMMIT:
FAMILIES REPAIRED:
FAMILIES STOPPED:
NINE COUNTERS ZERO ON:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A repaired family is a repaired family. It must be verified again, by someone who neither built nor repaired it.
