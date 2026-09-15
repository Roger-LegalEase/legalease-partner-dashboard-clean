# CO — JDF-435 — Order Denying Petition to Seal Arrest and Criminal Records When No Charges Filed

Family `jdf-435-form-order-en` in `colorado`, built by `scripts/rcap-official-forms/build-colorado-caption-only-families.mjs` on 2026-09-15 (factory `d0-remediated-v1`).

## Why this is a participant-filed document

JDF 416 Guide to Sealing Arrest Records (No Charges Filed) (R: July 1, 2025, sha256 `26b07edc2300b2fd9dc8a5114fa3738fb4b377a7aa1ea089cecf6861b96235af`) lists it under "File the Request" as **JDF 435 Order (just do §§ A-C)**. The petitioner files it with the caption completed; the court completes the rest.

The order DENYING the petition, tendered alongside the JDF 418 order granting it so the court can sign whichever outcome it reaches. It is not a second grant order, and a participant must not be told otherwise. The petitioner completes the caption only; the finding, the reasons, the signature, the date and the certificate of service are the court's.

## Source identity

- Custody: `nationwide_recovery_pool_2026_09_02`, index path `LegalEase Colorado/JDF 435 order denying petition to seal.pdf` (identical bytes at `LegalEase Colorado/reference-only/JDF-435__order-denying-petition-to-seal-arrest-records-no-charges-filed__rev-2019-08.pdf`)
- sha256 `59026b6ad9809e21fd9cb071adb5725329ac7a65f4a7c3055b11ac57b9f2dd15`, 50394 bytes, 1 page(s), flat PDF with no form fields
- Printed revision: R8/19; freshness: `revision_confirmation_required`
- The held binary is R8/19 with an unlettered caption band and a printed CERTIFICATE OF SERVICE block; the JDF 416 that names it is R: July 1, 2025 and tells the filer to complete "§§ A-C", which this revision does not letter. A later revision of JDF 435 is therefore likely and was not obtainable.
- The issuing court's hosts were unreachable from the build environment on 2026-09-15: the egress proxy answered 403 to CONNECT for www.coloradojudicial.gov:443 and www.courts.state.co.us:443, so the current revision could not be fetched and compared. The held revision is used and named; currency is an open source-freshness review item.

## Caption policy

- participant: 3
- withheld_by_review: 1
- court_or_agency: 3

Canonical writes: `County, Colorado` ← `matter.county`, `Petition of: Defendant (Primary subject of the criminal justice record)` ← `participant.full_legal_name`, `Case Number:` ← `matter.case_number`. Court address withheld (not a held fact). Everything after the caption refused by role.
Anchors: `countyBlank`, `courtAddress`, `petitioner`, `caseNumber`, measured from the page content stream (see field-census.json → captionAnchors).

## Rendered evidence

- `fixtures/canonical-filled.pdf` — sha256 `8ff5b99bc40ae1f5947a5318ccec529a976e9f5efbcba1b0a2387ae951214796`, 45020 bytes
- `fixtures/boundary-filled.pdf` — sha256 `637f0b8b738c56f812152e9ae6a502e8549d5f9208df7a21af3a97f522b1d19b`, 45006 bytes
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
