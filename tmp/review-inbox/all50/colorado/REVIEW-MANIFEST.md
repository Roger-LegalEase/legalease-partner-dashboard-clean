# Colorado — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: CO
- Name: Colorado
- Slug: colorado
- State-pack directory: src/lib/rcap/state-packs/colorado/

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
- record_clearing_review: Colorado record-clearing review → guidance_packet
- official_form_overlay: Colorado official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Colorado custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 33
  - Colorado-RecordSealing-Agent-Reference.pdf (23329 bytes)
  - JDF 2361 - Z Rem.pdf (566503 bytes)
  - JDF 419 Order and Notice of Hearing.pdf (50720 bytes)
  - JDF 435 order denying petition to seal.pdf (50394 bytes)
  - JDF 684 Order Denying Petition to Seal Criminal Conviction Municipal Records.pdf (49317 bytes)
  - JDF 685 Order and Notice of Hearing on Petition to Seal Criminal Conviction Municipal Records.pdf (50317 bytes)
  - JDF2370.pdf (614271 bytes)
  - JDF2371.pdf (669287 bytes)
  - JDF2374.pdf (1051131 bytes)
  - JDF302.pdf (121346 bytes)
  - JDF302.spanish.pdf (165950 bytes)
  - JDF304.pdf (1083204 bytes)
  - JDF324.pdf (30539 bytes)
  - JDF324.spanish.pdf (37438 bytes)
  - JDF326.pdf (91947 bytes)
  - JDF326.spanish.pdf (154831 bytes)
  - JDF416.pdf (655751 bytes)
  - JDF417.pdf (1651354 bytes)
  - JDF418.pdf (596551 bytes)
  - JDF477.pdf (666230 bytes)
  - JDF478.pdf (652768 bytes)
  - JDF492.pdf (546426 bytes)
  - JDF493.pdf (552269 bytes)
  - JDF493.spanish.pdf (1027753 bytes)
  - JDF611.pdf (631473 bytes)
  - JDF612.pdf (737628 bytes)
  - JDF614.pdf (555787 bytes)
  - JDF615.pdf (1054204 bytes)
  - JDF641.pdf (721895 bytes)
  - JDF642.pdf (612824 bytes)
  - JDF682.pdf (137369 bytes)
  - JDF683.pdf (82760 bytes)
  - JDF686.pdf (63657 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Colorado record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for Colorado.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Colorado can advance from state_built to approved_for_live.
