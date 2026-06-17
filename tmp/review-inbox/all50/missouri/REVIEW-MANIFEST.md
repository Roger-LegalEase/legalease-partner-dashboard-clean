# Missouri — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: MO
- Name: Missouri
- Slug: missouri
- State-pack directory: src/lib/rcap/state-packs/missouri/

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
- record_clearing_review: Missouri record-clearing review → guidance_packet
- official_form_overlay: Missouri official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Missouri custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 7
  - Conf Case Filing Info Sheet(FI-05).pdf (298649 bytes)
  - EXPUNGEMENT FORM.pdf (944665 bytes)
  - Judgment and Order of Expungement - Section 610.140 RSMo CR370.pdf (103658 bytes)
  - Modified-MSPD-Pro-Se-FormFillable.pdf (752748 bytes)
  - motion-and-affidavit-in-support-of-request-to-proceed-as-a-poor-person.pdf (87146 bytes)
  - petition-for-expungement-mistaken-identity.pdf (952015 bytes)
  - petition-for-expungement-of-arrest-records.pdf (16977 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Missouri record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for Missouri.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Missouri can advance from state_built to approved_for_live.
