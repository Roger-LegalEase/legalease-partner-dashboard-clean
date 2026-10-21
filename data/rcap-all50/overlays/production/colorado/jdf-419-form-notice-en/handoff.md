# CO — JDF-419 — Order and Notice of Hearing (Sealing of Arrest and Criminal Records When No Charges Filed)

Family `jdf-419-form-notice-en` in `colorado`, built by `scripts/rcap-official-forms/build-colorado-caption-only-families.mjs` on 2026-09-15 (factory `d0-remediated-v1`).

## Why this is a participant-filed document

JDF 416 Guide to Sealing Arrest Records (No Charges Filed) (R: July 1, 2025, sha256 `26b07edc2300b2fd9dc8a5114fa3738fb4b377a7aa1ea089cecf6861b96235af`) lists it under "File the Request" as **JDF 419 Notice (Just do §§ A-C)**. The petitioner files it with the caption completed; the court completes the rest.

The court's order setting a hearing on the petition and the notice of that hearing. The petitioner tenders it with the caption completed; the court supplies the finding, the hearing location, date and time, the judge's signature and the certificate of service.

## Source identity

- Custody: `nationwide_recovery_pool_2026_09_02`, index path `LegalEase Colorado/JDF 419 Order and Notice of Hearing.pdf` (identical bytes at `LegalEase Colorado/reference-only/JDF-419__order-and-notice-of-hearing-sealing-arrest-records-no-charges-filed__rev-2019-08.pdf`)
- sha256 `64012a2a3ef643f5b9a587e5181c3332f788764324003709913688d2f9bd86a2`, 50720 bytes, 1 page(s), flat PDF with no form fields
- Printed revision: R 8/19; freshness: `revision_confirmation_required`
- The held binary is R 8/19 with an unlettered caption band and a printed CERTIFICATE OF SERVICE block; the JDF 416 that names it is R: July 1, 2025 and tells the filer to complete "§§ A-C", which this revision does not letter. A later revision of JDF 419 is therefore likely and was not obtainable.
- The issuing court's hosts were unreachable from the build environment on 2026-09-15: the egress proxy answered 403 to CONNECT for www.coloradojudicial.gov:443 and www.courts.state.co.us:443, so the current revision could not be fetched and compared. The held revision is used and named; currency is an open source-freshness review item.

## Caption policy

- participant: 3
- withheld_by_review: 1
- court_or_agency: 3

Canonical writes: `County, Colorado` ← `matter.county`, `Petition of: Defendant (Primary subject of the criminal justice record)` ← `participant.full_legal_name`, `Case Number:` ← `matter.case_number`. Court address withheld (not a held fact). Everything after the caption refused by role.
Anchors: `countyBlank`, `courtAddress`, `petitioner`, `caseNumber`, measured from the page content stream (see field-census.json → captionAnchors).

## Rendered evidence

- `fixtures/canonical-filled.pdf` — sha256 `7ff4aaf8484e6e7baaeebb9c27a5976a47b2cf70e5ef60b55564b688d7339724`, 45150 bytes
- `fixtures/boundary-filled.pdf` — sha256 `4e805ddc1a2f5f6862f9df5a4578c4d59359f5dd83a9e5f71e9dc4eb28a868c1`, 45136 bytes
- negative fixture: 0 write(s)

## Holds carried forward

- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `source_currency_review_required_issuer_unreachable`
- `state_legal_review_missing_from_supplied_corpus`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`

## Review status

`implementation_complete_pending_independent_review`. This build does not approve its own output: nothing here is visually approved, source-current, counsel-approved, sellable or live.
