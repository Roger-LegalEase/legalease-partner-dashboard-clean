# CO — JDF-641 — Motion to Seal Multiple Conviction Records

Family `jdf-641-form-motion-en` in `colorado`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-641__motion-to-seal-multiple-conviction-records__REV-2025-07-01__EN.pdf`
- Manifest sha256: `6ad1d7c43b454b3b50c9c77313528b9660ada8a730d9ed5c384479809173ab02`
- Delivered sha256: `6ad1d7c43b454b3b50c9c77313528b9660ada8a730d9ed5c384479809173ab02` — matches
- Revision: REV-2025-07-01; role MOTION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 122, first-hand census reads 113

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 14
- manual: 87
- participant: 6
- signature: 3
- withheld_by_review: 3

## What was written

6 field(s) bound from the canonical fixture; 107 refused.

- `County` ← `matter.county`
- `Case Number` ← `matter.case_number`
- `∆ DoB` ← `participant.date_of_birth`
- `∆ Street Address` ← `participant.street_address`
- `∆ Phone` ← `participant.phone`
- `∆ Email` ← `participant.email`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 5/5 held
- Boundary fixture refused 1 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_legal_review_missing_from_supplied_corpus`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 122, first-hand census of the hash-verified binary reads 113. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
