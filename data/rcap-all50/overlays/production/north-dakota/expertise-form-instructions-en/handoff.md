# ND — EXPERTISE — Instructions for Petition to Close Nonconviction Records

Family `expertise-form-instructions-en` in `north-dakota`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/ND/02_PACKET_FORMS/ND__FORM__EXPERTISE__instructions-for-petition-to-close-nonconviction-records__REV-2025-08-01__EN.pdf`
- Manifest sha256: `21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f`
- Delivered sha256: `21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f` — matches
- Revision: REV-2025-08-01; role INSTRUCTIONS; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 24, first-hand census reads 20

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 5
- manual: 2
- participant: 12
- withheld_by_review: 1

## What was written

12 field(s) bound from the canonical fixture; 8 refused.

- `Defendant Name` ← `participant.full_legal_name`
- `city` ← `participant.city`
- `county` ← `matter.county`
- `state` ← `participant.state`
- `Printed Name` ← `participant.full_legal_name`
- `Address` ← `participant.street_address`
- `City State Zip Code` ← `participant.city_state_zip`
- `Telephone Number` ← `participant.phone`
- `Judicial District` ← `matter.court`
- `County` ← `matter.county`
- `Case Number` ← `matter.case_number`
- `Defendant` ← `participant.full_legal_name`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 5/5 held
- Boundary fixture refused 2 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 24, first-hand census of the hash-verified binary reads 20. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
