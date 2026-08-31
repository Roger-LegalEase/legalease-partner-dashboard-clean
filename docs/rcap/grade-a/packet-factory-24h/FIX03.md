# FIX03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** rapid-repair
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `72f99073c42bd28e3469efe316378b37601717c7` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --family ca-1203-42-set \
  --codex-cloud \
  --minimum-captain-sha 72f99073c42bd28e3469efe316378b37601717c7
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

## The 4 families

- `ca-1203-42-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, incompleteRows, requiredOptionsMissing, requiredComponentsMissing
- `nj_arrest_no_conviction-set` — failing: knownRequiredFieldsMissing
- `ny_160_59_petition-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, requiredComponentsMissing
- `pa_9122_1_limited_access-set` — failing: knownRequiredFieldsMissing, unclassifiedBlanks, incompleteRows, requiredComponentsMissing

## What you receive

Only the failed families and their exact failed proof obligations.

A repair lane does not repeat broad family analysis. If the failure is not reproducible from the obligations you were given, stop and say so rather than re-deriving the family.

**After repair, the family goes to a verifier that is neither its builder nor its repairer. Captain routes it; you do not choose.**

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/fix03/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/**`
- `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-42-set.mjs`
- `scripts/build-census-v1-ny_160_59_petition-set.mjs`
- `scripts/build-census-v1-pa_9122_1_limited_access-set.mjs`

## Never write here

- `scripts/rcap-packet-completeness/**`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-grade-a/codex-cloud/p2v01-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v02-washington-independent-verification/**`
- `data/rcap-grade-a/codex-cloud/p2v03-washington-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8a-nj-disorderly-persons/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-17b-reduction-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8b-ca-17b-reduction/**`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8c-ca-1203-43/**`
- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**`
- `scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs`
- `data/rcap-grade-a/codex-cloud/r8d-az-marijuana-superior-court/**`
- `data/rcap-grade-a/codex-cloud/sdv01-south-dakota-independent-verification/**`
- `data/rcap-all50/overlays/census-v1/**/nj-ordinance-set*`
- `data/rcap-all50/overlays/census-v1/**/pa-summary-conviction-set*`
- `data/rcap-all50/overlays/census-v1/**/ut-pet-dismissed-without-prejudice-set*`
- `data/rcap-all50/overlays/census-v1/**/wa-vac-homicide-victim-prostitution-set*`
- `data/rcap-all50/overlays/census-v1/**/wv-conv-single-misdemeanor-set*`
- `data/rcap-all50/overlays/census-v1/**/ny-160-59-petition-set*`

## Required outputs

- data/rcap-grade-a/packet-factory-24h/fix03/rows.json — one row per family: itemId, status, the obligation repaired, and the nine counters after

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
