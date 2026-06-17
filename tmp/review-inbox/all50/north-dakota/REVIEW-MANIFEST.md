# North Dakota — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: ND
- Name: North Dakota
- Slug: north-dakota
- State-pack directory: src/lib/rcap/state-packs/north-dakota/

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
- record_clearing_review: North Dakota record-clearing review → guidance_packet
- official_form_overlay: North Dakota official form overlay draft → official_pdf_overlay_draft
- custom_pleading: North Dakota custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 11
  - 1. N of Motion to Prohibit Public Access AR41 5f1.pdf (1208303 bytes)
  - 10. Confidential Info Form AR41 5f1.pdf (1236475 bytes)
  - 2. Motion to Prohibit Public Access AR41 5f1.pdf (1244725 bytes)
  - 3. Brief Prohibit Public Access AR41 5f1.pdf (1425955 bytes)
  - 4. Declaration Prohibit Public Access AR41 5f1.pdf (1288096 bytes)
  - 5. Findings Concl Order Prohibit Public Access AR41 5f1.pdf (1675405 bytes)
  - 6. Affidavit Service Mail Motion AR41 5f1.pdf (1291529 bytes)
  - Close-Nonconviction-Records.pdf (1319263 bytes)
  - Expungement.pdf (274927 bytes)
  - Sealing Criminal Records Research Guide.pdf (303777 bytes)
  - Sealing-DUI-Records-Research-Guide.pdf (222600 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: North Dakota record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for North Dakota.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether North Dakota can advance from state_built to approved_for_live.
