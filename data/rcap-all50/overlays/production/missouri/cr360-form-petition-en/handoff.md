# MO — CR360 — Petition for Expungement - Section 610.140, RSMo.

Family `cr360-form-petition-en` in `missouri`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/MO/02_PACKET_FORMS/MO__FORM__CR360__petition-for-expungement-section-610-140-rsmo__REV-2024-10__EN.pdf`
- Manifest sha256: `6bfbf26a54f374f7c6bd6dcb59bc199bfe897890c1b3265513b2e7df43990745`
- Delivered sha256: `6bfbf26a54f374f7c6bd6dcb59bc199bfe897890c1b3265513b2e7df43990745` — matches
- Revision: REV-2024-10; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 82, first-hand census reads 82

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 9
- manual: 2
- participant: 10
- protected: 25
- unused_row: 14
- withheld_by_review: 22

## What was written

9 field(s) bound from the canonical fixture; 73 refused.

- `Case NumberRow1` ← `matter.charges[0].case_number`
- `Description of ChargeRow1` ← `matter.charges[0].charge`
- `Case NumberRow2` ← `matter.charges[1].case_number`
- `Description of ChargeRow2` ← `matter.charges[1].charge`
- `Case number` ← `matter.case_number`
- `Petitioner` ← `participant.full_legal_name`
- `Full Name` ← `participant.full_legal_name`
- `Date of Birth` ← `participant.date_of_birth`
- `P current address` ← `participant.street_address`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 6/6 held
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
