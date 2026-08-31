# SIN02

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
  --family al-diversion-set::official-form:CR-65 \
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

Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.

## What bounds this lane

the private corpus and the committed inventory, read only — nothing is fetched here

**47 obligations · 33 families released if all clear · hosts: AL, AZ, CO, ID, MD, MO, RI, VA**

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Every acquired or promoted source records



**undefined**

### Families this lane releases

`al-diversion-set`, `al-felony-dwop-set`, `al-felony-nonconviction-90-set`, `al-misd-conviction-set`, `al-misd-dwop-set`, `al-misd-nonconviction-90-set`, `al-pardon-set`, `al-pardoned-felony-set`, `al-trafficking-set`, `az_certificate_second_chance-set`, `az_marijuana_expungement_limited_jurisdiction-set`, `az_record_sealing_conviction-set`, `az_set_aside-set`, `co_municipal_conviction_seal-set`, `co_petition_seal_arrest-set`, `id_clean_slate_shield-set`, `md_10105_early-set`, `md_10105_favorable-set`, `md_10110_conviction-set`, `md_cannabis_petition-set`, `md_pardon_expungement-set`, `mo-575-120-identity-theft-correction-set`, `mo-610-122-arrest-expungement-set`, `mo-610-140-arrest-set`, `mo-610-140-conviction-set`, `mo-610-145-mistaken-identity-set`, `mo-art-xiv-marijuana-set`, `ri_decriminalized-set`, `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`, `va_exp_identity_used_by_another-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/sin02/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/sin02/**`

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

- data/rcap-grade-a/packet-factory-24h/sin02/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/sin02/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
