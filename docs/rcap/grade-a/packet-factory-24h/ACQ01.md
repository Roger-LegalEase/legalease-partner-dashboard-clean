# ACQ01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
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
  --family agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge::NO_DOCUMENT_SOURCE_NAMED \
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

Dispatch one exact acquisition per official URL through .github/workflows/rcap-official-source-acquisition.yml. One URL, one dispatch, one receipt. This environment cannot fetch; the workflow does it where egress is allowed.

## What bounds this lane

one issuing host per lane, so a host that rate-limits blocks only its own lane

**35 obligations · 31 families this lane WOULD release if every one of them resolves · hosts: AL, DE, GA, KY, MT, NM, NV, OK, OR, PA, RI, WV, WY**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Every acquired or promoted source records



**undefined**

### Families this lane would release

`agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge`, `agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction`, `composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition`, `composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route`, `composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247`, `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief`, `composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement`, `composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement`, `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement`, `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708`, `ga-deaddocket-j3-set`, `ga-felony-j1-set`, `ga-fugitive-j5-set`, `ga-jail-k2-set`, `ga-misd-j4-set`, `ga-nonconv-post2013-set`, `ga-pardon-j7-set`, `ga-seal-m-set`, `ga-vacated-j2-set`, `ky_criminal_record_segregation-set`, `nv_repository_removal-set`, `nv_seal_probation_family-set`, `rcap-ga-guidance-implementation`, `rcap-nv-custom-pleading`, `rcap-ok-custom-pleading`, `rcap-or-official-pdf-fill`, `rcap-wv-custom-pleading`, `ri_marijuana-set`, `wv_dui_deferral_expungement-set`, `wy_fel_1502-set`

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/acq01/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/acq01/**`

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

- data/rcap-grade-a/packet-factory-24h/acq01/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/acq01/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
