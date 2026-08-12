# WA — Blake 004 Record-Vacatur Form

- Lane: D2A (first build; this state had no package root at the D0 base)
- Document: `BLAKE-004` REV-2025-12 (EN)
- Workflow key: `WA:BLAKE-004:SERVICE:EN`
- Source sha256: `4fc9b490f332e76fa59104d4bff1458f3bdab53f3f6e139cdf3b66ab1700d0c7` — verified against the Edition 1 STATE_MANIFEST
- Structure: flat (declared `flat_pdf`)
- Ownership: service_block_no_participant_fill
- Status: `no_fill_service_block_document`

## What was bound

Flat form with no widgets. 0 overlay anchors measured out of the page content streams.

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
- pass — value_far_exceeds_widget: a value that cannot be drawn at 6pt is refused, not clipped
- pass — bound_field_is_protected_category: no bound field matches a protect rule

This package is complete pending independent review. It is not approved, not terminal and not runtime-selectable.
