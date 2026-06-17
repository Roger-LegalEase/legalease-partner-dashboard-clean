# Washington — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: WA
- Name: Washington
- Slug: washington
- State-pack directory: src/lib/rcap/state-packs/washington/

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
- record_clearing_review: Washington record-clearing review → guidance_packet
- official_form_overlay: Washington official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Washington custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 10
  - CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf (133614 bytes)
  - CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf (160031 bytes)
  - CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf (135696 bytes)
  - CrRLJ 09_0150 Notice of Hearing_2019 07.pdf (105414 bytes)
  - CrRLJ 09.0100 Petition to Vacate Conviction_(f)(U).pdf (161259 bytes)
  - CrRLJ 09.0200 Ord Pet Vacate Conviction_(f)(U).pdf (160460 bytes)
  - CrRLJ 09.0300 InstructVacateMisdConvictions_2022 07.pdf (128109 bytes)
  - CrRLJ 09.0800 PetitionDeclVacateConviction_Cannabis_2022 07(2).pdf (57643 bytes)
  - CrRLJ 09.0870 OrderPetVacateConviction_Cannabis_2022 07(2).pdf (136567 bytes)
  - JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf (136817 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Washington record-clearing guidance fallback

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

- Confirm eligibility pathways are legally accurate for Washington.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Washington can advance from state_built to approved_for_live.
