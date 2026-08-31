# SAC04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
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
  --family az_wrongful_arrest_clearance-set::NO_DOCUMENT_SOURCE_NAMED \
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

Dispatch one exact acquisition per official URL through .github/workflows/rcap-official-source-acquisition.yml. One URL, one dispatch, one receipt. This environment cannot fetch; the workflow does it where egress is allowed.

## What bounds this lane

one issuing host per lane, so a host that rate-limits blocks only its own lane

**26 obligations · 26 families released if all clear · hosts: AZ, DC, IN, KS, ND, NE, OR, UT, VA, WY**

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Every acquired or promoted source records



**undefined**

### Families this lane releases

`az_wrongful_arrest_clearance-set`, `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement`, `census-pending-family:UT:path-m-juvenile-expungement`, `composed-treatment:nd-nonconviction-auto-close-verify`, `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708`, `dc_correct_misattributed_arrest-set`, `dc_innocence_expungement-set`, `dc_seal_conviction-set`, `dc_seal_fugitive-set`, `dc_seal_nonconviction-set`, `dc_yra_set_aside-set`, `in_infraction_nondisclosure-set`, `ks-21-6614-conviction-set`, `ks-21-6614-diversion-set`, `ks-21-6614-prostitution-coercion-set`, `ks-21-6614-specialty-court-set`, `ks-22-2410-arrest-set`, `ks-22-4908-registration-relief-set`, `nd-deferred-imposition-records-set`, `ne-expunge-le-error-set`, `ne-seal-enforcement-set`, `rcap-ks-custom-pleading`, `rcap-nd-custom-pleading`, `rcap-or-official-pdf-fill`, `va_exp_absolute_pardon-set`, `wy_fel_1502-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/sac04/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/sac04/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`
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

## Required outputs

- data/rcap-grade-a/packet-factory-24h/sac04/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/sac04/receipts.json — the eleven recorded fields per resolved source; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-packet-factory-24h/verify.mjs`

> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- NEVER promote a source without exact bytes. A promotion is a release, and a released family goes to a builder that will try to open the file.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an obligation that cannot be settled here is STOPPED naming the exact host and the next operation that owns it.

Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.

## How you return

Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.

```text
ASSIGNMENT:
OPERATION:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
HANDED OFF:
FAMILIES RELEASED:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
PROMOTIONS WITHOUT EXACT BYTES: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.
