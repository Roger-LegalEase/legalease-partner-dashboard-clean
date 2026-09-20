# CO — JDF-614 — Order and Notice of Hearing (re sealing conviction records)

Family `jdf-614-form-notice-en` in `colorado`, built by `scripts/rcap-official-forms/build-colorado-caption-only-families.mjs` on 2026-09-15 (factory `d0-remediated-v1`).

## Why this is a participant-filed document

JDF 611 Guide to Sealing Conviction Records (district or county court case) (R: August 7, 2024, sha256 `b628ee77cfdbb1e02208a74b04f6a03083e2843505f4bb4a7c3e0f2b3503843e`) lists it under "File the Request" as **JDF 614 Notice (Just do §§ A-C)**. The petitioner files it with the caption completed; the court completes the rest.

The court's order setting a hearing on the motion and the notice of that hearing, used when the court finds a hearing necessary. The movant tenders it with sections A-C completed; the hearing date and time, the finding that a hearing is necessary, the objection deadline and the signature are the court's.

## Source identity

- Custody: `nationwide_recovery_pool_2026_09_02`, index path `LegalEase Colorado/JDF614.pdf` (identical bytes at `LegalEase Colorado/reference-only/JDF-614__order-and-notice-of-hearing-sealing-conviction-records__rev-2024-08-07.pdf`)
- sha256 `08f0a13f9aa7f5036f6f28748648fdee56aed9ee1f511f6f10e183e0bfa5e08b`, 555787 bytes, 1 page(s), AcroForm with 16 fields
- Printed revision: R: August 7, 2024; freshness: `candidate_current_source`
- The held binary is R: August 7, 2024, the same revision as the JDF 611 guide that names it. Whether the Judicial Department has since revised it could not be checked.
- The issuing court's hosts were unreachable from the build environment on 2026-09-15: the egress proxy answered 403 to CONNECT for www.coloradojudicial.gov:443 and www.courts.state.co.us:443, so the current revision could not be fetched and compared. The held revision is used and named; currency is an open source-freshness review item.

## Caption policy

- election_control: 1
- participant: 3
- withheld_by_review: 1
- court_or_agency: 11

Canonical writes: `County` ← `matter.county`, `∆` ← `participant.full_legal_name`, `Case Number` ← `matter.case_number`. Court address withheld (not a held fact). Everything after the caption refused by role.


## Rendered evidence

- `fixtures/canonical-filled.pdf` — sha256 `457b631842ffa72507b6d4bfee667b04e32f8cbf9523e7b6b9dd583f6c738987`, 125484 bytes
- `fixtures/boundary-filled.pdf` — sha256 `2a68e2ebd72ab1dcfaa4dc8155a70eef6d10ec632d49c54e93e48b3364aa29df`, 125514 bytes
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
