# AZ — Order Regarding Application for Certificate of Second Chance

- Lane: D2A (first build; this state had no package root at the D0 base)
- Document: `AOCCRSA4F-103023` REV-2023-10-30 (EN)
- Workflow key: `AZ:AOCCRSA4F-103023:ORDER:EN`
- Source sha256: `b3aae63fd8ae2fc891fed28ab2c0807d1b3564921912bc3ae67898aecedc635e` — verified against the Edition 1 STATE_MANIFEST
- Structure: flat (declared `flat_pdf`)
- Ownership: court_issued_caption_only
- Status: `overlay_implemented_pending_independent_review`

## What was bound

Flat form with no widgets. 1 overlay anchors measured out of the page content streams.

Every field starts protected. A field binds only when D0's typed binder reaches the same fact from the field's name and from the printed context measured beside the widget. Court, clerk, prosecutor, attorney, agency, service-recipient, outside-party, signature, notary, money and race fields are refused by construction.

## Holds carried forward

- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `source_gated_never_runtime_selectable`
- `freshness_source_or_currentness_gate_open`
- `legal_review_mapping_status_see_state_legal_review`
- `state_legal_review_missing_release_blocker`

## Verification

- pass — source_bytes_perturbed: the factory refuses to render a source whose hash does not match its pin
- pass — non_filing_notice_asserted: a form stating it is not for filing raises NonFilingHoldError and produces no fill
- pass — contact_sheet_given_unfilled_artifact: the sheet refuses when the filled panel is not the finalized artifact
- pass — value_far_exceeds_widget: a value that cannot be drawn at 6pt is refused, not clipped
- pass — bound_field_is_protected_category: no bound field matches a protect rule
- pass — the canonical fixture renders to identical bytes on a second run
- pass — the contact sheet is built from the finalized artifact and every expected value is provably visible in it

This package is complete pending independent review. It is not approved, not terminal and not runtime-selectable.
