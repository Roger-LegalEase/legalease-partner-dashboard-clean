# CO — JDF-2363 — Request for a Hearing - Automatic Conviction Sealing

Family `jdf-2363-form-form-en` in `colorado`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-2363__request-for-a-hearing-automatic-conviction-sealing__REV-2024-02-01__EN.pdf`
- Manifest sha256: `abec6d716d028670a3b1e26c2a1b512ce320421253e6b85ec40e636d05577e33`
- Delivered sha256: `abec6d716d028670a3b1e26c2a1b512ce320421253e6b85ec40e636d05577e33` — matches
- Revision: REV-2024-02-01; role FORM; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 18, first-hand census reads 16

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 1
- manual: 11
- participant: 2
- signature: 1
- withheld_by_review: 1

## What was written

2 field(s) bound from the canonical fixture; 14 refused.

- `Court County` ← `matter.county`
- `Case Number` ← `matter.case_number`

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

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 18, first-hand census of the hash-verified binary reads 16. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
