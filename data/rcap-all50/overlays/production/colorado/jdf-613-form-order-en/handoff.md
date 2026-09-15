# CO — JDF-613 — Order Denying Request to Seal Conviction Records

Family `jdf-613-form-order-en` in `colorado`, built by `scripts/rcap-official-forms/build-colorado-caption-only-families.mjs` on 2026-09-15 (factory `d0-remediated-v1`).

## Why this is a participant-filed document

JDF 611 Guide to Sealing Conviction Records (district or county court case) (R: August 7, 2024, sha256 `b628ee77cfdbb1e02208a74b04f6a03083e2843505f4bb4a7c3e0f2b3503843e`) lists it under "File the Request" as **JDF 613 Order (just do §§ A-C)**. The petitioner files it with the caption completed; the court completes the rest.

The order DENYING the request to seal, tendered alongside the JDF 615 order granting it so the court can sign whichever outcome it reaches. Page 1 is headed "JDF 613 Order Denying Request to Seal Conviction Records"; its section 1 Decision is the court's finding and its section 2 So Ordered is the court's signature. The movant completes sections A-C only.

## Source identity

- Custody: `nationwide_recovery_pool_2026_09_02`, index path `LegalEase Colorado/reference-only/JDF-613__order-denying-request-to-seal-conviction-records__rev-2024-08-07.pdf`
- sha256 `0745d99f233c7df13286c581c912d9f87b15187270e3d1773455c1ed51848677`, 545525 bytes, 1 page(s), AcroForm with 13 fields
- Printed revision: R: August 7, 2024; freshness: `candidate_current_source`
- The held binary is R: August 7, 2024, the same revision as the JDF 611 guide that names it. Whether the Judicial Department has since revised it could not be checked.
- The issuing court's hosts were unreachable from the build environment on 2026-09-15: the egress proxy answered 403 to CONNECT for www.coloradojudicial.gov:443 and www.courts.state.co.us:443, so the current revision could not be fetched and compared. The held revision is used and named; currency is an open source-freshness review item.

## Caption policy

- election_control: 1
- participant: 3
- withheld_by_review: 1
- court_or_agency: 8

Canonical writes: `County` ← `matter.county`, `∆` ← `participant.full_legal_name`, `Case Number` ← `matter.case_number`. Court address withheld (not a held fact). Everything after the caption refused by role.


## Rendered evidence

- `fixtures/canonical-filled.pdf` — sha256 `0819d7dbf3e9a2d0a51eb2ecbb023be5f2562e75893a88bb40ce0809cb85c21e`, 113025 bytes
- `fixtures/boundary-filled.pdf` — sha256 `5a2b6bc7d8aced953b00c68371dc95d1023626b19114ed4e18a6e81acc008123`, 113052 bytes
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
