# SOURCE_4_INEXACT_MATCH_PROMOTION

**Engine:** Codex  ·  **Lane:** source-identity-acquisition-promotion  ·  **Sequence:** 2
**Worker branch:** `codex/source-04-inexact-match-promotion`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Promote a near-match to an exact identity or refuse it. A token-subset match inside the right jurisdiction is not an identity, and a family naming no document-shaped source needs one named before anything can be acquired.

## What bounds this lane

the families whose match is a token subset, and those naming no document-shaped source at all

These are the obligations standing between the 57 families in this class and tomorrow's build queue. Clearing one releases the families that name it; clearing none holds the build lanes at today's ceiling.

**60 obligations · 57 families released if all clear · hosts: AR, AZ, CT, DC, GA, ID, IL, IN, KY, MA, ME, MN, MS, ND, NE, NV, RI, UT, VA, VT, WA, WV, WY**

Absence classes: no_document_shaped_source_named.

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Families this lane releases

`ar-act346-set`, `ar-arrest-seal-set`, `ar-misdemeanor-dwi-seal-set`, `ar-pardon-seal-set`, `az_wrongful_arrest_clearance-set`, `census-pending-family:ME:juvenile-sealing`, `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement`, `census-pending-family:UT:path-m-juvenile-expungement`, `census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260`, `ct-cannabis-petition-set`, `ct-decriminalized-set`, `ct-missed-erasure-set`, `ct-nolle-auto-set`, `ct-pardon-erasure-set`, `ct-under18-misdemeanor-set`, `dc_correct_misattributed_arrest-set`, `dc_innocence_expungement-set`, `dc_seal_conviction-set`, `dc_seal_fugitive-set`, `dc_seal_nonconviction-set`, `dc_yra_set_aside-set`, `ga-deaddocket-j3-set`, `ga-felony-j1-set`, `ga-fugitive-j5-set`, `ga-jail-k2-set`, `ga-misd-j4-set`, `ga-nonconv-post2013-set`, `ga-pardon-j7-set`, `ga-seal-m-set`, `ga-vacated-j2-set`, `id_felony_reduction-set`, `id_set_aside_dismissal-set`, `il-prostitution-j-vacate-set`, `in_infraction_nondisclosure-set`, `ky_criminal_record_segregation-set`, `ma-bmc-multi-set`, `me-nonconv-set`, `me-screening-set`, `mn_prosecutor_agreed-set`, `ms-diversion-set`, `ms-fel-set`, `ms-misd-1st-set`, `ms-misd-addl-set`, `ms-nonadj-set`, `ms-nonconv-set`, `nd-deferred-imposition-records-set`, `ne-expunge-le-error-set`, `ne-seal-enforcement-set`, `nv_repository_removal-set`, `nv_seal_probation_family-set`, `ri_marijuana-set`, `va_exp_absolute_pardon-set`, `vt_exp_deferred_sentence-set`, `vt_seal_under_25-set`, `wa_crop_certificate_of_restoration-set`, `wv_dui_deferral_expungement-set`, `wy_fel_1502-set`

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/source-04-inexact-match-promotion/**`
- `data/rcap-grade-a/source-acquisition/mass-production/source-04-inexact-match-promotion/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/mass-production/source-04-inexact-match-promotion/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/mass-production/source-04-inexact-match-promotion/receipts.json — for anything resolved, the exact form number or SHA-256 and where it was found; no body is committed

### Output schema

Array key `rows`, item key `itemId`, status words: `COMPLETED`, `STOPPED`.

An unrecognised status is refused at integration rather than translated.

## Focused tests

- `node scripts/grade-a-launch-control/verify-launch-control.mjs`

> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.

## Stop conditions

- NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.
- NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.
- LANE STOP — you build no packet and you touch no overlay directory.
- ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from, never a near-match promoted to an identity.

Stopping with an honest account of what is missing is a complete return.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
OBLIGATIONS RESOLVED:
OBLIGATIONS STOPPED:
FAMILIES RELEASED INTO THE BUILD QUEUE:
IDENTITIES GUESSED: 0
SOURCE BODIES COMMITTED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A bound source is a bound source. It builds nothing, proves nothing and approves nothing.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/source-04-inexact-match-promotion 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-source-04-inexact-match-promotion.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/source-04-inexact-match-promotion`.
