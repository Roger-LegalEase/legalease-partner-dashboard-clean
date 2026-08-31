# DISC06

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id DISC06 \
  --source-obligation 'composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route::NO_DOCUMENT_SOURCE_NAMED' \
  --codex-cloud \
  --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59
```

It must print **`SOURCE_CONVEYOR_PREFLIGHT_READY`**. The lane gate and each owned row gate must both pass.

## Never run these

- `git fetch`
- `git pull`
- `git push`
- `gh `
- `git worktree`
- `git remote add`
- `git clone`

## Claim before you read

- Assert every family before reading or writing anything: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert DISC06 <familyId>`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Release each family when it is finished: `node scripts/grade-a-packet-factory-24h/claim.mjs --release DISC06 <familyId>`, and leave that in your diff.

## How to raster

- Page rasters go through `scripts/lib/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**42 obligations · 38 families this lane WOULD release if every one of them resolves · hosts: FL, GA, MA, MS, OK, OR, PA, WY**

> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.

> This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.

### Required operation record schema

- itemId
- sourceId
- jurisdiction
- issuingAuthority
- officialTitle
- formNumber
- revision
- officialUrl
- urlKind
- intendedPacketRole
- statewideOrLocal
- familyIds
- evidencePaths
- handoffOperation

### Exact obligation rows

| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | OK | `exact-source-identity` | `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | OK | `exact-source-identity` | `composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | PA | `exact-source-identity` | `composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WY | `exact-source-identity` | `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708` | unresolved exact identity or URL | `ACQ` |
| `fl-10yr-bridge-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-10yr-bridge-set` | unresolved exact identity or URL | `ACQ` |
| `fl-administrative-set::official-form:FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION` | `official-form:FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-administrative-set` | unresolved exact identity or URL | `ACQ` |
| `fl-early-juvenile-set::official-form:FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION` | `official-form:FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-early-juvenile-set` | unresolved exact identity or URL | `ACQ` |
| `fl-expunction-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-expunction-set` | unresolved exact identity or URL | `ACQ` |
| `fl-juvenile-diversion-set::official-form:FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION` | `official-form:FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-juvenile-diversion-set` | unresolved exact identity or URL | `ACQ` |
| `fl-sealing-set::official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | `official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION` | FL | `exact-source-identity` | `fl-sealing-set` | unresolved exact identity or URL | `ACQ` |
| `fl-self-defense-set::official-form:FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION` | `official-form:FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION` | FL | `exact-source-identity` | `fl-self-defense-set` | unresolved exact identity or URL | `ACQ` |
| `ga-deaddocket-j3-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-deaddocket-j3-set` | unresolved exact identity or URL | `ACQ` |
| `ga-felony-j1-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-felony-j1-set` | unresolved exact identity or URL | `ACQ` |
| `ga-fugitive-j5-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-fugitive-j5-set` | unresolved exact identity or URL | `ACQ` |
| `ga-jail-k2-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-jail-k2-set` | unresolved exact identity or URL | `ACQ` |
| `ga-misd-j4-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-misd-j4-set` | unresolved exact identity or URL | `ACQ` |
| `ga-nonconv-post2013-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-nonconv-post2013-set` | unresolved exact identity or URL | `ACQ` |
| `ga-nonconv-pre2013-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-nonconv-pre2013-set` | unresolved exact identity or URL | `ACQ` |
| `ga-pardon-j7-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-pardon-j7-set` | unresolved exact identity or URL | `ACQ` |
| `ga-seal-m-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-seal-m-set` | unresolved exact identity or URL | `ACQ` |
| `ga-vacated-j2-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `ga-vacated-j2-set` | unresolved exact identity or URL | `ACQ` |
| `ma-bmc-multi-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MA | `exact-source-identity` | `ma-bmc-multi-set` | unresolved exact identity or URL | `ACQ` |
| `ma-expunge-k-set::official-form:Petition for Expungement, G.L. c. 276, § 100K` | `official-form:Petition for Expungement, G.L. c. 276, § 100K` | MA | `exact-source-identity` | `ma-expunge-k-set` | unresolved exact identity or URL | `ACQ` |
| `ma-expunge-time-set::official-form:Massachusetts Probation Service Petition to Expunge` | `official-form:Massachusetts Probation Service Petition to Expunge` | MA | `exact-source-identity` | `ma-expunge-time-set` | unresolved exact identity or URL | `ACQ` |
| `ma-seal-admin-set::official-form:Petition to Seal (Office of the Commissioner of Probation)` | `official-form:Petition to Seal (Office of the Commissioner of Probation)` | MA | `exact-source-identity` | `ma-seal-admin-set` | unresolved exact identity or URL | `ACQ` |
| `ma-seal-decrim-set::official-form:Petition to Seal (Office of the Commissioner of Probation), Part A box 4` | `official-form:Petition to Seal (Office of the Commissioner of Probation), Part A box 4` | MA | `exact-source-identity` | `ma-seal-decrim-set` | unresolved exact identity or URL | `ACQ` |
| `ms-diversion-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-diversion-set` | unresolved exact identity or URL | `ACQ` |
| `ms-fel-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-fel-set` | unresolved exact identity or URL | `ACQ` |
| `ms-misd-1st-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-misd-1st-set` | unresolved exact identity or URL | `ACQ` |
| `ms-misd-addl-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-misd-addl-set` | unresolved exact identity or URL | `ACQ` |
| `ms-nonadj-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-nonadj-set` | unresolved exact identity or URL | `ACQ` |
| `ms-nonconv-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `ms-nonconv-set` | unresolved exact identity or URL | `ACQ` |
| `rcap-ga-guidance-implementation::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | GA | `exact-source-identity` | `rcap-ga-guidance-implementation` | unresolved exact identity or URL | `ACQ` |
| `rcap-ms-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | MS | `exact-source-identity` | `rcap-ms-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-ok-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | OK | `exact-source-identity` | `rcap-ok-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-or-official-pdf-fill::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | OR | `exact-source-identity` | `rcap-or-official-pdf-fill` | unresolved exact identity or URL | `ACQ` |
| `wy_fel_1502-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WY | `exact-source-identity` | `wy_fel_1502-set` | unresolved exact identity or URL | `ACQ` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC06 --source-obligation 'composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route::NO_DOCUMENT_SOURCE_NAMED' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route`, `composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4`, `composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26`, `composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59`, `composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59`, `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief`, `composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement`, `composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement`, `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708`, `fl-administrative-set`, `fl-early-juvenile-set`, `fl-juvenile-diversion-set`, `fl-self-defense-set`, `ga-deaddocket-j3-set`, `ga-felony-j1-set`, `ga-fugitive-j5-set`, `ga-jail-k2-set`, `ga-misd-j4-set`, `ga-nonconv-post2013-set`, `ga-pardon-j7-set`, `ga-seal-m-set`, `ga-vacated-j2-set`, `ma-bmc-multi-set`, `ma-expunge-k-set`, `ma-expunge-time-set`, `ma-seal-admin-set`, `ma-seal-decrim-set`, `ms-diversion-set`, `ms-fel-set`, `ms-misd-1st-set`, `ms-misd-addl-set`, `ms-nonadj-set`, `ms-nonconv-set`, `rcap-ga-guidance-implementation`, `rcap-ms-custom-pleading`, `rcap-ok-custom-pleading`, `rcap-or-official-pdf-fill`, `wy_fel_1502-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| FL-RULE-3.989-ORDER | FL | 4 |
| FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION | FL | 1 |
| FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION | FL | 1 |
| FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION | FL | 1 |
| FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION | FL | 1 |
| GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013 | GA | 1 |
| Petition for Expungement, G.L. c. 276, § 100K | MA | 1 |
| Massachusetts Probation Service Petition to Expunge | MA | 1 |
| Petition to Seal (Office of the Commissioner of Probation) | MA | 1 |
| Petition to Seal (Office of the Commissioner of Probation), Part A box 4 | MA | 1 |
| NO_DOCUMENT_SOURCE_NAMED | GA | 0 |
| NO_DOCUMENT_SOURCE_NAMED | MS | 0 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc06/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc06/**`

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

- data/rcap-grade-a/packet-factory-24h/disc06/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc06/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
