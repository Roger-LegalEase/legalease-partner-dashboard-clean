# Nebraska — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: NE
- Name: Nebraska
- Slug: nebraska
- State-pack directory: src/lib/rcap/state-packs/nebraska/

## Build status

- buildStatus: state_built
- Status history: not_started → nationwide_resources_found → resource_packet_ingested → official_forms_ingested → overlay_field_maps_drafted → overlay_samples_rendered → state_pack_built → guidance_packet_rendered → state_built

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

Pathways:
- record_clearing_review: Nebraska record-clearing review → guidance_packet
- official_form_overlay: Nebraska official form overlay draft → official_pdf_overlay_draft

## Official forms found

- Official PDFs in inventory: 3
  - CC-6-11-2.pdf (2766067 bytes)
  - CC-6-11.pdf (3003355 bytes)
  - CC-6-12.pdf (1682731 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Nebraska record-clearing guidance fallback

## Custom pleading support status

- Supported: no
- Status: guidance_fallback_only

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

- Confirm eligibility pathways are legally accurate for Nebraska.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Nebraska can advance from state_built to approved_for_live.
