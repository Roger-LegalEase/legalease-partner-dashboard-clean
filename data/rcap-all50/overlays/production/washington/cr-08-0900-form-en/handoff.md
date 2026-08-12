# WA — CR-08.0900 CR08.0900 Mt and Decl for Or Vacating Record of Felony 2025 07

- Lane: D2A (first build; this state had no package root at the D0 base)
- Document: `CR-08.0900` REV-2025-07 (EN)
- Workflow key: `WA:CR-08.0900:MOTION:EN`
- Source sha256: `ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e` — verified against the Edition 1 STATE_MANIFEST
- Structure: flat (declared `flat_pdf`)
- Ownership: participant_completed
- Status: `overlay_implemented_pending_independent_review`

## What was bound

Flat form with no widgets. 1 overlay anchors measured out of the page content streams.

Every field starts protected. A field binds only when D0's typed binder reaches the same fact from the field's name and from the printed context measured beside the widget. Court, clerk, prosecutor, attorney, agency, service-recipient, outside-party, signature, notary, money and race fields are refused by construction.

## Holds carried forward

- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `freshness_candidate_current_source`
- `legal_review_mapping_status_see_state_legal_review`

## Verification

- pass — source_bytes_perturbed: the factory refuses to render a source whose hash does not match its pin
- pass — non_filing_notice_asserted: a form stating it is not for filing raises NonFilingHoldError and produces no fill
- pass — contact_sheet_given_unfilled_artifact: the sheet refuses when the filled panel is not the finalized artifact
- pass — value_far_exceeds_widget: a value that cannot be drawn at 6pt is refused, not clipped
- pass — bound_field_is_protected_category: no bound field matches a protect rule
- pass — the canonical fixture renders to identical bytes on a second run
- pass — the contact sheet is built from the finalized artifact and every expected value is provably visible in it

This package is complete pending independent review. It is not approved, not terminal and not runtime-selectable.
