# Pennsylvania — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: PA
- Name: Pennsylvania
- Slug: pennsylvania
- State-pack directory: src/lib/rcap/state-packs/pennsylvania/

## Build status

- buildStatus: state_built
- Status history: not_started → nationwide_resources_found → resource_packet_ingested → official_forms_ingested → overlay_field_maps_drafted → overlay_samples_rendered → state_pack_built → pleading_packet_rendered → guidance_packet_rendered → state_built

## Review statuses (tracked separately from buildStatus)

- QA: pending
- Visual: pending
- Counsel: pending
- Source freshness: pending

## Legacy generator status

- Pennsylvania has a preserved legacy live generator. The all-50 review artifacts are additive and must not alter legacy routing or output.

## Products / pathways covered

Products:
- record_clearing_guidance_packet
- official_pdf_overlay_draft
- custom_pleading_or_state_pack_draft

Pathways:
- record_clearing_review: Pennsylvania record-clearing review → guidance_packet
- official_form_overlay: Pennsylvania official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Pennsylvania custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 14
  - 143137-172055-motionforexpungementjuvenilefillable.pdf (214546 bytes)
  - 172056-orderforexpungementjuvenilefillable.pdf (214409 bytes)
  - 213820-file-6290.pdf (930254 bytes)
  - 213825-file-6289.pdf (760347 bytes)
  - 213835-file-6288.pdf (2355925 bytes)
  - 213843-file-6287.pdf (877743 bytes)
  - 215125-file-5632.pdf (673358 bytes)
  - 215133-file-5631.pdf (803224 bytes)
  - 222539-blankexpungementorder4900311121-000064.pdf (143399 bytes)
  - 222549-blankexpungementorder7900309121-000065.pdf (151853 bytes)
  - 222603-petitionforexpungement490030912-000076.pdf (87204 bytes)
  - 222612-petitionforexpungement790030912-000077.pdf (87647 bytes)
  - dna_removal_request.pdf (83541 bytes)
  - sp4-170.pdf (109501 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Pennsylvania record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for Pennsylvania.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Pennsylvania can advance from state_built to approved_for_live.
