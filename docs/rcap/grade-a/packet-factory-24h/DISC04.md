# DISC04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** source-swarm
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.
**Minimum required ancestor:** `7476708c6236b7b2ce1b1112dbeef434d3957c59` (or the newer dispatch base)
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER DISC PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## Before anything else

```sh
source $HOME/.legalease-corpus-env
node scripts/verify-packet-build-environment.mjs \
  --assignment-id DISC04 \
  --source-obligation 'agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission::NO_DOCUMENT_SOURCE_NAMED' \
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

- Assert every family before reading or writing anything: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert DISC04 <familyId>`
- A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.
- Release each family when it is finished: `node scripts/grade-a-packet-factory-24h/claim.mjs --release DISC04 <familyId>`, and leave that in your diff.

## How to raster

- Page rasters go through `scripts/lib/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.
- NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.
- The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after.

## Mission

Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.

## What bounds this lane

the issuing court or agency that publishes the document

**43 obligations · 28 families this lane WOULD release if every one of them resolves · hosts: CT, KY, LA, NM, NV, NY, VA, WA**

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
| `agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NY | `exact-source-identity` | `agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission` | unresolved exact identity or URL | `ACQ` |
| `agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NM | `exact-source-identity` | `agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement` | unresolved exact identity or URL | `ACQ` |
| `agency-application-treatment:obligation:track-only:CT:ct-destruction-request::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `agency-application-treatment:obligation:track-only:CT:ct-destruction-request` | unresolved exact identity or URL | `ACQ` |
| `agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon` | unresolved exact identity or URL | `ACQ` |
| `agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure` | unresolved exact identity or URL | `ACQ` |
| `census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WA | `exact-source-identity` | `census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NY | `exact-source-identity` | `composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request` | unresolved exact identity or URL | `ACQ` |
| `composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NV | `exact-source-identity` | `composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247` | unresolved exact identity or URL | `ACQ` |
| `ct-cannabis-petition-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-cannabis-petition-set` | unresolved exact identity or URL | `ACQ` |
| `ct-decriminalized-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-decriminalized-set` | unresolved exact identity or URL | `ACQ` |
| `ct-missed-erasure-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-missed-erasure-set` | unresolved exact identity or URL | `ACQ` |
| `ct-nolle-auto-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-nolle-auto-set` | unresolved exact identity or URL | `ACQ` |
| `ct-pardon-erasure-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-pardon-erasure-set` | unresolved exact identity or URL | `ACQ` |
| `ct-under18-misdemeanor-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | CT | `exact-source-identity` | `ct-under18-misdemeanor-set` | unresolved exact identity or URL | `ACQ` |
| `ky_criminal_record_segregation-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | KY | `exact-source-identity` | `ky_criminal_record_segregation-set` | unresolved exact identity or URL | `ACQ` |
| `la-976-arrest-no-conviction-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-976-arrest-no-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-976-arrest-no-conviction-set::official-form:LA-CCRP-ART-989` | `official-form:LA-CCRP-ART-989` | LA | `exact-source-identity` | `la-976-arrest-no-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-976-arrest-no-conviction-set::official-form:LA-CCRP-ART-991` | `official-form:LA-CCRP-ART-991` | LA | `exact-source-identity` | `la-976-arrest-no-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-976-arrest-no-conviction-set::official-form:LA-CCRP-ART-992` | `official-form:LA-CCRP-ART-992` | LA | `exact-source-identity` | `la-976-arrest-no-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-977-misdemeanor-conviction-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-977-misdemeanor-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-977-misdemeanor-conviction-set::official-form:LA-CCRP-ART-989` | `official-form:LA-CCRP-ART-989` | LA | `exact-source-identity` | `la-977-misdemeanor-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-977-misdemeanor-conviction-set::official-form:LA-CCRP-ART-991` | `official-form:LA-CCRP-ART-991` | LA | `exact-source-identity` | `la-977-misdemeanor-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-977-misdemeanor-conviction-set::official-form:LA-CCRP-ART-992` | `official-form:LA-CCRP-ART-992` | LA | `exact-source-identity` | `la-977-misdemeanor-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-977d-marijuana-first-offense-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-977d-marijuana-first-offense-set` | unresolved exact identity or URL | `ACQ` |
| `la-977d-marijuana-first-offense-set::official-form:LA-CCRP-ART-991` | `official-form:LA-CCRP-ART-991` | LA | `exact-source-identity` | `la-977d-marijuana-first-offense-set` | unresolved exact identity or URL | `ACQ` |
| `la-977d-marijuana-first-offense-set::official-form:LA-CCRP-ART-992` | `official-form:LA-CCRP-ART-992` | LA | `exact-source-identity` | `la-977d-marijuana-first-offense-set` | unresolved exact identity or URL | `ACQ` |
| `la-978-felony-conviction-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-978-felony-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-978-felony-conviction-set::official-form:LA-CCRP-ART-989` | `official-form:LA-CCRP-ART-989` | LA | `exact-source-identity` | `la-978-felony-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-978-felony-conviction-set::official-form:LA-CCRP-ART-991` | `official-form:LA-CCRP-ART-991` | LA | `exact-source-identity` | `la-978-felony-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-978-felony-conviction-set::official-form:LA-CCRP-ART-992` | `official-form:LA-CCRP-ART-992` | LA | `exact-source-identity` | `la-978-felony-conviction-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-1-interim-expungement-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-985-1-interim-expungement-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-1-interim-expungement-set::official-form:LA-CCRP-ART-994` | `official-form:LA-CCRP-ART-994` | LA | `exact-source-identity` | `la-985-1-interim-expungement-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-expungement-by-redaction-set::official-form:LA-CCRP-ART-988` | `official-form:LA-CCRP-ART-988` | LA | `exact-source-identity` | `la-985-expungement-by-redaction-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-expungement-by-redaction-set::official-form:LA-CCRP-ART-989` | `official-form:LA-CCRP-ART-989` | LA | `exact-source-identity` | `la-985-expungement-by-redaction-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-expungement-by-redaction-set::official-form:LA-CCRP-ART-991` | `official-form:LA-CCRP-ART-991` | LA | `exact-source-identity` | `la-985-expungement-by-redaction-set` | unresolved exact identity or URL | `ACQ` |
| `la-985-expungement-by-redaction-set::official-form:LA-CCRP-ART-992` | `official-form:LA-CCRP-ART-992` | LA | `exact-source-identity` | `la-985-expungement-by-redaction-set` | unresolved exact identity or URL | `ACQ` |
| `la-987-set-aside-and-dismiss-set::official-form:LA-CCRP-ART-987` | `official-form:LA-CCRP-ART-987` | LA | `exact-source-identity` | `la-987-set-aside-and-dismiss-set` | unresolved exact identity or URL | `ACQ` |
| `nv_repository_removal-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NV | `exact-source-identity` | `nv_repository_removal-set` | unresolved exact identity or URL | `ACQ` |
| `nv_seal_probation_family-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NV | `exact-source-identity` | `nv_seal_probation_family-set` | unresolved exact identity or URL | `ACQ` |
| `rcap-nv-custom-pleading::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | NV | `exact-source-identity` | `rcap-nv-custom-pleading` | unresolved exact identity or URL | `ACQ` |
| `rcap-wa-custom-pleading-clean-tracks::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WA | `exact-source-identity` | `rcap-wa-custom-pleading-clean-tracks` | unresolved exact identity or URL | `ACQ` |
| `va_exp_absolute_pardon-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | VA | `exact-source-identity` | `va_exp_absolute_pardon-set` | unresolved exact identity or URL | `ACQ` |
| `wa_crop_certificate_of_restoration-set::NO_DOCUMENT_SOURCE_NAMED` | `NO_DOCUMENT_SOURCE_NAMED` | WA | `exact-source-identity` | `wa_crop_certificate_of_restoration-set` | unresolved exact identity or URL | `ACQ` |

Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:

```sh
node scripts/verify-packet-build-environment.mjs --assignment-id DISC04 --source-obligation 'agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission::NO_DOCUMENT_SOURCE_NAMED' --codex-cloud --minimum-captain-sha 7476708c6236b7b2ce1b1112dbeef434d3957c59

# A failed row is recorded STOPPED; continue with unrelated rows.
```

**Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.**

### Families this lane would release

`agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission`, `agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement`, `agency-application-treatment:obligation:track-only:CT:ct-destruction-request`, `agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon`, `agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure`, `census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260`, `composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request`, `composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247`, `ct-cannabis-petition-set`, `ct-decriminalized-set`, `ct-missed-erasure-set`, `ct-nolle-auto-set`, `ct-pardon-erasure-set`, `ct-under18-misdemeanor-set`, `ky_criminal_record_segregation-set`, `la-976-arrest-no-conviction-set`, `la-977-misdemeanor-conviction-set`, `la-977d-marijuana-first-offense-set`, `la-978-felony-conviction-set`, `la-985-1-interim-expungement-set`, `la-985-expungement-by-redaction-set`, `la-987-set-aside-and-dismiss-set`, `nv_repository_removal-set`, `nv_seal_probation_family-set`, `rcap-nv-custom-pleading`, `rcap-wa-custom-pleading-clean-tracks`, `va_exp_absolute_pardon-set`, `wa_crop_certificate_of_restoration-set`


### Settle these first

**Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.**

| Document | Jurisdiction | Families waiting |
| --- | --- | --- |
| LA-CCRP-ART-988 | LA | 6 |
| LA-CCRP-ART-987 | LA | 1 |
| NO_DOCUMENT_SOURCE_NAMED | NY | 0 |
| NO_DOCUMENT_SOURCE_NAMED | NM | 0 |
| NO_DOCUMENT_SOURCE_NAMED | CT | 0 |
| NO_DOCUMENT_SOURCE_NAMED | CT | 0 |
| NO_DOCUMENT_SOURCE_NAMED | CT | 0 |
| NO_DOCUMENT_SOURCE_NAMED | WA | 0 |
| NO_DOCUMENT_SOURCE_NAMED | NY | 0 |
| NO_DOCUMENT_SOURCE_NAMED | NV | 0 |
| NO_DOCUMENT_SOURCE_NAMED | CT | 0 |
| NO_DOCUMENT_SOURCE_NAMED | CT | 0 |

> On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.

## Owned paths — write only here

- `data/rcap-grade-a/packet-factory-24h/disc04/**`
- `data/rcap-grade-a/source-acquisition/packet-factory-24h/disc04/**`

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

- data/rcap-grade-a/packet-factory-24h/disc04/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases
- data/rcap-grade-a/source-acquisition/packet-factory-24h/disc04/receipts.json — the eleven recorded fields per resolved source; no body is committed

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
