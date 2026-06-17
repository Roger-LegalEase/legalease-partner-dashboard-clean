# South Dakota — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: SD
- Name: South Dakota
- Slug: south-dakota
- State-pack directory: src/lib/rcap/state-packs/south-dakota/

## Build status

- buildStatus: state_built
- Status history: not_started → nationwide_resources_found → resource_packet_ingested → official_forms_ingested → overlay_field_maps_drafted → overlay_samples_rendered → state_pack_built → pleading_packet_rendered → guidance_packet_rendered → state_built

## Review statuses (tracked separately from buildStatus)

- QA: pending
- Visual: pending
- Counsel: pending
- Source freshness: pending

## Legacy generator status

- No legacy live generator for this jurisdiction; all-50 state pack is the build-first source of review material.

## Products / pathways covered

Products:
- record_clearing_guidance_packet
- official_pdf_overlay_draft
- custom_pleading_or_state_pack_draft

Pathways:
- record_clearing_review: South Dakota record-clearing review → guidance_packet
- official_form_overlay: South Dakota official form overlay draft → official_pdf_overlay_draft
- custom_pleading: South Dakota custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 7
  - ujs-232-case-filing-statement-written.pdf (121267 bytes)
  - ujs-390-expungement-instructions.pdf (96890 bytes)
  - ujs-392-waiver-of-expungement-hearing-07_2025.pdf (137212 bytes)
  - ujs-393-notice-of-hearing-for-expungement-of-record_08_2025.pdf (128333 bytes)
  - ujs-394-order-of-expungement_06_2023.pdf (92135 bytes)
  - ujs-395-notice-of-entry-of-expungement-order_06_2023.pdf (160338 bytes)
  - ujs391-motion-for-expungement-and-affidavit-of-mailing-final-07_2025.pdf (156690 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: South Dakota record-clearing guidance fallback

## Custom pleading support status

- Supported: yes
- Status: draft_config_allowed

## Overlay status

- pending_overlay_samples (draft_ready)

## Missing / pending items

- Official PDF overlay samples pending render.
- Overlay field maps pending verification.
- Visual alignment review pending.
- QA review pending.
- Counsel review pending.
- Source freshness review pending.

## Recommended QA focus

- Confirm required user inputs map to the selected pathway.
- Confirm filing destination guidance is non-fabricated and source-backed.
- Confirm filing steps are coherent and complete.
- Confirm fees/copies/service notes are either present or explicitly marked unavailable.
- Confirm guidance fallback renders for internal review.

## Recommended attorney-review focus

- Confirm eligibility pathways are legally accurate for South Dakota.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether South Dakota can advance from state_built to approved_for_live.
