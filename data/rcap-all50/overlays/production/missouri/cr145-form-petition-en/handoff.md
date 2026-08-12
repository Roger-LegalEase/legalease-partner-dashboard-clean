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

## No fill produced

This family is participant-completed but no fill was produced; the reason is recorded in the holds below and in `reports/`.

## Holds carried forward

- `d0_factory_cannot_finalize_rich_text_acroform`
- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `state_open_item_build_blocker`
- `track_level_import_mapping_required`

## Findings

- **blocker** `source_carries_rich_text_field_d0_factory_cannot_finalize` — Rich-text field(s) 'Other Defendants', 'Address at Time of Arrest'. pdf-lib throws RichTextFieldReadError from updateFieldAppearances inside sanitizeAndFlatten, so no finalized artifact can be produced for this family until the shared factory handles rich-text fields. No fill is claimed and the source was not modified.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
