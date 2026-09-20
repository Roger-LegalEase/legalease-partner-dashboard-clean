# CO — JDF-478 — Order to Seal Non-Conviction Records

Family `jdf-478-form-order-en` in `colorado`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-478__order-to-seal-non-conviction-records__REV-2024-08-07__EN.pdf`
- Manifest sha256: `8208caab3019164f8f0671aea1f0dbcf460805d61455346887cfd1d133c0e159`
- Delivered sha256: `8208caab3019164f8f0671aea1f0dbcf460805d61455346887cfd1d133c0e159` — matches
- Revision: REV-2024-08-07; role ORDER; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 35, first-hand census reads 32

## Ownership

The manifest gives this document the role of a court order. The court, not the participant, completes it, so the lane writes nothing into it at all rather than relying on the caption-only path to hold the line.

## Field classification

- not_participant_writable: 32

## No fill produced

This document is not participant-completed, so nothing is written into it.

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `not_participant_fillable_no_fixture_fill`
- `state_legal_review_missing_from_supplied_corpus`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 35, first-hand census of the hash-verified binary reads 32. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
