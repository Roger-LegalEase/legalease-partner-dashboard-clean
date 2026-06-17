# South Carolina — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: SC
- Name: South Carolina
- Slug: south-carolina
- State-pack directory: src/lib/rcap/state-packs/south-carolina/

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
- record_clearing_review: South Carolina record-clearing review → guidance_packet
- official_form_overlay: South Carolina official form overlay draft → official_pdf_overlay_draft
- custom_pleading: South Carolina custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 6
  - SCCA223A1.pdf (1045144 bytes)
  - SCCA223A1(a).pdf (229845 bytes)
  - SCCA223B1.pdf (154780 bytes)
  - SCCA223D1.pdf (11932 bytes)
  - SCCA223E.pdf (106144 bytes)
  - SCCA492.pdf (321133 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: South Carolina record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for South Carolina.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether South Carolina can advance from state_built to approved_for_live.
