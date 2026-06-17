# Utah — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: UT
- Name: Utah
- Slug: utah
- State-pack directory: src/lib/rcap/state-packs/utah/

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
- record_clearing_review: Utah record-clearing review → guidance_packet
- official_form_overlay: Utah official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Utah custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 12
  - 02_Victim_Statement.pdf (108630 bytes)
  - 03_Petitioner_Reply.pdf (104506 bytes)
  - 04_Request_Response_APP.pdf (96738 bytes)
  - 05_Response_APP.pdf (101390 bytes)
  - 06_Notice_of_Hearing.pdf (123935 bytes)
  - 09_Acceptance_of_service.pdf (192790 bytes)
  - 09_Consent-waiver_of_hearing.pdf (191518 bytes)
  - 1002EX_Petition_to_Expunge_Records_Traffic_Conviction.pdf (108871 bytes)
  - 1003EX_Petition_to_Expunge_Records_Cannabis_Conviction.pdf (129711 bytes)
  - 1022EX_Order_Traffic_Records_Conviction.pdf (108785 bytes)
  - 1023EX_Order_Cannabis_Conviction.pdf (110830 bytes)
  - Civil_Filing_Cover_Sheet.pdf (119736 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Utah record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for Utah.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Utah can advance from state_built to approved_for_live.
