# NH — NHJB-3124 — PETITION OF ELIGIBILITY FOR ANNULMENT OF RECORD OF ARREST OR

Family `nhjb-3124-form-petition-en` in `new-hampshire`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/NH/02_PACKET_FORMS/NH__FORM__NHJB-3124__petition-of-eligibility-for-annulment-of-record-of-arrest-or__REV-2020-01__EN.pdf`
- Manifest sha256: `eee788220b7e624f0294d00b01024bff251d5d1dbfe61062c9a8f78fab58529c`
- Delivered sha256: `eee788220b7e624f0294d00b01024bff251d5d1dbfe61062c9a8f78fab58529c` — matches
- Revision: REV-2020-01; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 28, first-hand census reads 28

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 4
- manual: 9
- participant: 8
- protected: 6
- withheld_by_review: 1

## What was written

7 field(s) bound from the canonical fixture; 21 refused.

- `name.1` ← `participant.full_legal_name`
- `Mailing Address.1` ← `participant.street_address`
- `zip` ← `participant.zip`
- `case number1` ← `matter.charges[0].case_number`
- `DOB` ← `participant.date_of_birth`
- `Email` ← `participant.email`
- `case number` ← `matter.case_number`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 5/5 held
- Boundary fixture refused 0 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
