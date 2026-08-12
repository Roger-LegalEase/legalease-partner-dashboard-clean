# CO — JDF-417 — Petition to Seal Arrest Records - No Charges Filed

Family `jdf-417-form-petition-en` in `colorado`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-417__petition-to-seal-arrest-records-no-charges-filed__REV-2025-07-01__EN.pdf`
- Manifest sha256: `e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4`
- Delivered sha256: `e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4` — matches
- Revision: REV-2025-07-01; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 70, first-hand census reads 62

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 9
- manual: 45
- participant: 4
- signature: 3
- withheld_by_review: 1

## What was written

4 field(s) bound from the canonical fixture; 58 refused.

- `County` ← `matter.county`
- `Case Number` ← `matter.case_number`
- `∆ Street Address` ← `participant.street_address`
- `∆ City` ← `participant.city`

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

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 70, first-hand census of the hash-verified binary reads 62. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
