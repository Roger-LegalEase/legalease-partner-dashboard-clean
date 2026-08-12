# MO — CR145 — Petition for Expungement of Arrest Records

Family `cr145-form-petition-en` in `missouri`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/MO/02_PACKET_FORMS/MO__FORM__CR145__petition-for-expungement-of-arrest-records__REV-2024-04__EN.pdf`
- Manifest sha256: `7c527bf351e9ab08658f901abc9be15e12e5beb2afe7ded14a8c5e2f0d6eb641`
- Delivered sha256: `7c527bf351e9ab08658f901abc9be15e12e5beb2afe7ded14a8c5e2f0d6eb641` — matches
- Revision: REV-2024-04; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 48, first-hand census reads 48

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 14
- manual: 9
- participant: 11
- protected: 14

## What was written

11 field(s) bound from the canonical fixture; 37 refused.

- `Other Defendants` ← `participant.full_legal_name`
- `Criminal Case Number` ← `matter.case_number`
- `Petitioner` ← `participant.full_legal_name`
- `Case Number` ← `matter.case_number`
- `County` ← `matter.county`
- `Full Name` ← `participant.full_legal_name`
- `Date of Birth` ← `participant.date_of_birth`
- `Address at Time of Arrest` ← `participant.street_address`
- `Arrest Citation Number` ← `matter.citation_number`
- `County where Petitioner was arrested` ← `matter.county`
- `Case Number of the Offense` ← `matter.case_number`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 4/4 held
- Boundary fixture refused 1 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `state_open_item_build_blocker`
- `track_level_import_mapping_required`

## Findings

- **informational** `source_carries_rich_text_field_converted_by_d0_v3` — Rich-text field(s) 'Other Defendants', 'Address at Time of Arrest'. Before D0-v3 these threw RichTextFieldReadError from updateFieldAppearances and no artifact could be produced for this family at all. They are now converted to ordinary text fields before appearances are generated, with the participant-visible value preserved and the /RV packet dropped.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
