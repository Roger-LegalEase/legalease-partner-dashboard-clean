# MO — CR375 — Petition for Expungement - Marijuana-Related Offense(s)

Family `cr375-form-petition-en` in `missouri`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/MO/02_PACKET_FORMS/MO__FORM__CR375__petition-for-expungement-marijuana-related-offense-s__REV-2024-10__EN.pdf`
- Manifest sha256: `2cfca7e9bea55d27de82b9aed2875db02872345592cc69af7a5aab400e4b0780`
- Delivered sha256: `2cfca7e9bea55d27de82b9aed2875db02872345592cc69af7a5aab400e4b0780` — matches
- Revision: REV-2024-10; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 77, first-hand census reads 77

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 7
- manual: 2
- participant: 7
- protected: 34
- unused_row: 7
- withheld_by_review: 20

## What was written

6 field(s) bound from the canonical fixture; 71 refused.

- `Case number` ← `matter.case_number`
- `Petitioner` ← `participant.full_legal_name`
- `P address` ← `participant.street_address`
- `Case NumberRow2` ← `matter.charges[1].case_number`
- `Case NumberRow1` ← `matter.charges[0].case_number`
- `p Full Name` ← `participant.full_legal_name`

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
- `state_manifest_generation_allowed_no`
- `state_open_item_build_blocker`
- `track_level_import_mapping_required`

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
