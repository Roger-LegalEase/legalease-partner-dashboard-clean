# SOURCE_2_LABEL_IDENTITY_RESOLUTION

**Engine:** Codex  ·  **Lane:** source-identity-acquisition-promotion  ·  **Sequence:** 2
**Worker branch:** `codex/source-02-label-identity-resolution`
**Branch from:** `27386bbf8471344143081de065311d761cfcf118`
**Read this assignment from:** `origin/claude/legalease-sprint-captain-utucnw` → `data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json`
**Workspace:** one isolated workspace, one branch. No shared worktree.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.

## Mission

Turn a descriptive label into a document identity: an exact form number or an exact content hash, resolved against committed inventories.

## What bounds this lane

the committed Nationwide inventory and the state packs, read only — nothing is fetched

These are the obligations standing between the 68 families in this class and tomorrow's build queue. Clearing one releases the families that name it; clearing none holds the build lanes at today's ceiling.

**147 obligations · 68 families released if all clear · hosts: AK, AR, DE, FL, IA, ID, IL, IN, LA, MA, MI, MT, ND, TX, UT**

Absence classes: label_does_not_identify_a_document.

> This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.

### Families this lane releases

`ak-mistaken-identity-set`, `ar-act346-set`, `ar-cs-possession-seal-set`, `ar-drug-court-set`, `ar-felony-seal-set`, `ar-misdemeanor-seal-set`, `ar-nonconviction-seal-set`, `ar-veterans-court-set`, `de_mandatory_expungement-set`, `fl-10yr-bridge-set`, `fl-administrative-set`, `fl-early-juvenile-set`, `fl-expunction-set`, `fl-juvenile-diversion-set`, `fl-sealing-set`, `fl-self-defense-set`, `ia-12346-set`, `ia-12347-set`, `ia-7251-set`, `ia-901c2-set`, `ia-901c3-set`, `ia-dci77-set`, `id_isp_expungement-set`, `il-cannabis-vacate-set`, `il-exp-nonconv-set`, `il-exp-pardon-set`, `il-exp-precompletion-set`, `il-exp-qualprob-set`, `il-exp-supervision-set`, `il-prb-cert-set`, `il-seal-2yr-set`, `il-seal-3yr-set`, `il-seal-edu-set`, `il-seal-nonconv-set`, `in_arrest_no_charges-set`, `in_conviction_d6-set`, `in_conviction_felony-set`, `in_conviction_misd-set`, `in_section1_petition-set`, `la-976-arrest-no-conviction-set`, `la-977-misdemeanor-conviction-set`, `la-977d-marijuana-first-offense-set`, `la-978-felony-conviction-set`, `la-985-1-interim-expungement-set`, `la-985-expungement-by-redaction-set`, `la-987-set-aside-and-dismiss-set`, `ma-expunge-k-set`, `ma-expunge-time-set`, `ma-seal-admin-set`, `ma-seal-decrim-set`, `mi_setaside_application-set`, `mi_setaside_first_owi-set`, `mi_setaside_trafficking-set`, `mt_mmrta_completed-set`, `mt_mmrta_serving-set`, `nd-nonconviction-close-petition-set`, `nd-prohibit-remote-public-access-set`, `tx_exp_acquittal-set`, `tx_nd_automatic_misdemeanor_deferred-set`, `tx_nd_conviction_no_supervision-set`, `tx_nd_deferred_other-set`, `tx_nd_dwi_conviction-set`, `tx_nd_dwi_deferred-set`, `tx_nd_dwi_probation-set`, `tx_nd_probation_misdemeanor-set`, `tx_nd_veterans_court-set`, `tx_nd_veterans_reemployment-set`, `ut_pet_remove_link-set`

## Owned paths — write only here

- `data/rcap-grade-a/mass-production/source-02-label-identity-resolution/**`
- `data/rcap-grade-a/source-acquisition/mass-production/source-02-label-identity-resolution/**`

## Never write here

- `data/rcap-all50/overlays/census-v1/**`
- `scripts/build-census-v1-*.mjs`
- `data/rcap-grade-a/launch-control/**`
- `private/**`

## Required outputs

- data/rcap-grade-a/mass-production/source-02-label-identity-resolution/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases
- data/rcap-grade-a/source-acquisition/mass-production/source-02-label-identity-resolution/receipts.json — for anything resolved, the exact form number or SHA-256 and where it was found; no body is committed

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
git checkout -b codex/source-02-label-identity-resolution 27386bbf8471344143081de065311d761cfcf118
git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json > /tmp/codex-source-02-label-identity-resolution.json
# STOP unless that file's captainBaseSha === 27386bbf8471344143081de065311d761cfcf118
npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
source private/source-corpus-environment.txt
export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
```

Commit your work and `git push -u origin codex/source-02-label-identity-resolution`.
